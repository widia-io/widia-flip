package auth

import (
	"context"
	"crypto/ed25519"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type ctxKey string

const userIDKey ctxKey = "user_id"

func ContextWithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

func UserIDFromContext(ctx context.Context) (string, bool) {
	v := ctx.Value(userIDKey)
	userID, ok := v.(string)
	if !ok || userID == "" {
		return "", false
	}
	return userID, true
}

type Claims struct {
	jwt.RegisteredClaims
}

type JWKSVerifier struct {
	jwksURL    string
	httpClient *http.Client

	mu   sync.RWMutex
	keys map[string]any
}

func NewJWKSVerifier(jwksURL string) *JWKSVerifier {
	if strings.TrimSpace(jwksURL) == "" {
		jwksURL = "http://localhost:3000/api/auth/jwks"
	}
	return &JWKSVerifier{
		jwksURL: jwksURL,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		keys: map[string]any{},
	}
}

func (v *JWKSVerifier) ValidateAuthorizationHeader(authorization string) (string, error) {
	if authorization == "" {
		return "", errors.New("missing Authorization header")
	}

	parts := strings.SplitN(authorization, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", errors.New("invalid Authorization header (expected Bearer)")
	}

	return v.ValidateJWT(parts[1])
}

func (v *JWKSVerifier) ValidateJWT(tokenString string) (string, error) {
	if tokenString == "" {
		return "", errors.New("missing token")
	}

	unverified := jwt.NewParser()
	tok, _, err := unverified.ParseUnverified(tokenString, &Claims{})
	if err != nil {
		return "", err
	}

	kid, _ := tok.Header["kid"].(string)
	alg, _ := tok.Header["alg"].(string)
	if alg == "" {
		return "", errors.New("missing alg header")
	}
	if !isAllowedAlg(alg) {
		return "", errors.New("unsupported token alg")
	}

	key, err := v.getKeyForKid(kid)
	if err != nil {
		return "", err
	}

	parser := jwt.NewParser(jwt.WithValidMethods([]string{alg}))
	verified, err := parser.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (any, error) {
		if tkid, _ := t.Header["kid"].(string); kid != "" && tkid != "" && tkid != kid {
			return nil, errors.New("kid mismatch")
		}
		return key, nil
	})
	if err != nil {
		return "", err
	}
	if !verified.Valid {
		return "", errors.New("invalid token")
	}

	claims, ok := verified.Claims.(*Claims)
	if !ok {
		return "", errors.New("invalid claims")
	}

	if claims.Subject == "" {
		return "", errors.New("missing sub claim")
	}
	if claims.ExpiresAt == nil {
		return "", errors.New("missing exp claim")
	}
	if time.Now().After(claims.ExpiresAt.Time) {
		return "", errors.New("token expired")
	}

	return claims.Subject, nil
}

func isAllowedAlg(alg string) bool {
	switch alg {
	case jwt.SigningMethodEdDSA.Alg(), jwt.SigningMethodRS256.Alg():
		return true
	default:
		return false
	}
}

func (v *JWKSVerifier) getKeyForKid(kid string) (any, error) {
	v.mu.RLock()
	key, ok := v.keys[kid]
	if ok {
		v.mu.RUnlock()
		return key, nil
	}
	if kid == "" && len(v.keys) == 1 {
		for _, k := range v.keys {
			v.mu.RUnlock()
			return k, nil
		}
	}
	v.mu.RUnlock()

	// Refresh once on cache miss.
	if err := v.refreshJWKS(); err != nil {
		return nil, err
	}

	v.mu.RLock()
	defer v.mu.RUnlock()
	key, ok = v.keys[kid]
	if ok {
		return key, nil
	}
	if kid == "" && len(v.keys) == 1 {
		for _, k := range v.keys {
			return k, nil
		}
	}
	return nil, errors.New("signing key not found")
}

type jwksDocument struct {
	Keys []jwk `json:"keys"`
}

type jwk struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	N   string `json:"n"`
	E   string `json:"e"`
	Use string `json:"use"`
	Alg string `json:"alg"`
}

func (v *JWKSVerifier) refreshJWKS() error {
	req, err := http.NewRequest(http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}

	res, err := v.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return errors.New("failed to fetch jwks")
	}

	var doc jwksDocument
	if err := json.NewDecoder(res.Body).Decode(&doc); err != nil {
		return err
	}

	keys := make(map[string]any, len(doc.Keys))
	for _, k := range doc.Keys {
		if k.Use != "" && k.Use != "sig" {
			continue
		}
		if k.Kid == "" {
			continue
		}

		switch k.Kty {
		case "OKP":
			// Ed25519
			if k.Crv != "Ed25519" || k.X == "" {
				continue
			}
			raw, err := base64.RawURLEncoding.DecodeString(k.X)
			if err != nil {
				continue
			}
			if len(raw) != ed25519.PublicKeySize {
				continue
			}
			keys[k.Kid] = ed25519.PublicKey(raw)
		case "RSA":
			if k.N == "" || k.E == "" {
				continue
			}
			nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
			if err != nil {
				continue
			}
			eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
			if err != nil {
				continue
			}

			n := new(big.Int).SetBytes(nBytes)
			e := 0
			for _, b := range eBytes {
				e = e<<8 + int(b)
			}
			if e == 0 {
				continue
			}

			keys[k.Kid] = &rsa.PublicKey{N: n, E: e}
		default:
			continue
		}
	}

	v.mu.Lock()
	v.keys = keys
	v.mu.Unlock()
	return nil
}

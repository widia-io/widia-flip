package storage

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	appconfig "github.com/widia-projects/widia-flip/services/api/internal/config"
)

// S3Client wraps the AWS S3 client for presigned URL operations
type S3Client struct {
	client        *s3.Client
	presignClient *s3.PresignClient
	bucket        string
	endpoint      string
	region        string
	creds         aws.Credentials
}

// NewS3Client creates a new S3 client configured for MinIO or AWS S3
func NewS3Client(cfg appconfig.S3Config) (*S3Client, error) {
	// Create custom resolver for MinIO endpoint
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if cfg.Endpoint != "" {
			return aws.Endpoint{
				URL:               cfg.Endpoint,
				HostnameImmutable: true,
			}, nil
		}
		return aws.Endpoint{}, &aws.EndpointNotFoundError{}
	})

	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(cfg.Region),
		config.WithEndpointResolverWithOptions(customResolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AccessKey,
			cfg.SecretKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = cfg.ForcePathStyle
	})

	return &S3Client{
		client:        client,
		presignClient: s3.NewPresignClient(client),
		bucket:        cfg.Bucket,
		endpoint:      cfg.Endpoint,
		region:        cfg.Region,
		creds: aws.Credentials{
			AccessKeyID:     cfg.AccessKey,
			SecretAccessKey: cfg.SecretKey,
		},
	}, nil
}

// GeneratePresignedUploadURL creates a presigned URL for uploading a file
// Uses manual signing to include Content-Type in signed headers (required by Supabase Storage)
func (c *S3Client) GeneratePresignedUploadURL(ctx context.Context, key, contentType string, expiresIn time.Duration) (string, error) {
	// Build the URL path with expiration in query string (must be signed)
	path := fmt.Sprintf("/%s/%s", c.bucket, key)
	fullURL := fmt.Sprintf("%s%s?X-Amz-Expires=%d", c.endpoint, path, int(expiresIn.Seconds()))

	// Create the HTTP request
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, fullURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Add Content-Type header (will be included in signature)
	req.Header.Set("Content-Type", contentType)

	// Create signer and presign
	signer := v4.NewSigner()
	presignedURL, _, err := signer.PresignHTTP(
		ctx,
		c.creds,
		req,
		"UNSIGNED-PAYLOAD", // For presigned PUT, payload is unsigned
		"s3",
		c.region,
		time.Now(),
		func(o *v4.SignerOptions) {
			o.DisableURIPathEscaping = true
		},
	)
	if err != nil {
		return "", fmt.Errorf("failed to presign request: %w", err)
	}

	return presignedURL, nil
}

// GeneratePresignedDownloadURL creates a presigned URL for downloading a file
func (c *S3Client) GeneratePresignedDownloadURL(ctx context.Context, key string, expiresIn time.Duration) (string, error) {
	req, err := c.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expiresIn))
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned download URL: %w", err)
	}

	return req.URL, nil
}

// DeleteObject deletes an object from S3
func (c *S3Client) DeleteObject(ctx context.Context, key string) error {
	_, err := c.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}
	return nil
}

// Bucket returns the configured bucket name
func (c *S3Client) Bucket() string {
	return c.bucket
}

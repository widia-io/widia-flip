FROM golang:1.24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git

COPY services/api/go.mod services/api/go.sum ./
RUN go mod download

COPY services/api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /api ./cmd/api

FROM alpine:3.19
RUN apk --no-cache add \
    ca-certificates \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont
ENV CHROME_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY --from=builder /api .
EXPOSE 8080
CMD ["./api"]

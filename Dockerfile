# First Stage
FROM alpine

COPY . .

RUN chmod -R ugo-x,u+rwX,go+rX,go-w .

# Second Stage
FROM lipanski/docker-static-website

COPY --from=0 . .
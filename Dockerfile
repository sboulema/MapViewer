# First Stage
FROM alpine

COPY . dist

RUN chmod -R ugo-x,u+rwX,go+rX,go-w dist

# Second Stage
FROM lipanski/docker-static-website

COPY --from=0 dist .
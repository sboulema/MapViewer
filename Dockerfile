# First Stage
FROM mkenney/npm

COPY . /src

RUN npm install
RUN /usr/local/bin/gulp build

# Second Stage
FROM nginx

COPY --from=0 /src/dist /usr/share/nginx/html/

EXPOSE 80
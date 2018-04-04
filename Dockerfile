# First Stage
FROM mkenney/npm

COPY . /src

RUN npm install
RUN gulp build

# Second Stage
FROM nginx

COPY --from=0 /src/dist /usr/share/nginx/html/

EXPOSE 80
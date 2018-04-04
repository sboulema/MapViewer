# First Stage
FROM mkenney/npm

COPY . /workspace

RUN npm install
RUN gulp build

# Second Stage
FROM nginx

COPY --from=0 /workspace/dist /usr/share/nginx/html/

EXPOSE 80
FROM nginx:latest

MAINTAINER Jo Frabetti <jf589f@att.com>

COPY ./site /usr/share/nginx/html

COPY ./site/favicon.ico /usr/share/nginx
FROM centos
RUN curl -sL https://rpm.nodesource.com/setup_10.x | bash -
RUN yum -y install nodejs
RUN npm install mysql
RUN npm install express
RUN npm install moment
RUN mkdir /var/mssensor
COPY mssens.js /var/mstemp/mssens.js
WORKDIR /var/mstemp
EXPOSE 9002
ENTRYPOINT ["node"]
CMD ["mssens.js"]

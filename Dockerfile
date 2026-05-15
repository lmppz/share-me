FROM denoland/deno:alpine
EXPOSE 7860
WORKDIR /app
COPY . .
CMD ["run", "--allow-net", "server.js"]

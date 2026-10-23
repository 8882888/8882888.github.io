FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Korean fonts are required when rendering the business-card SVG to PNG.
RUN apk add --no-cache font-noto-cjk fontconfig
COPY . .
RUN npm install --omit=dev --no-audit --no-fund
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD node -e "require('node:http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "server.js"]

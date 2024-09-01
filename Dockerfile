# Use the official PHP image with Nginx and PHP-FPM
FROM php:8.3-fpm

# Install Nginx
RUN apt-get update && apt-get install -y nginx

# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Copy project files to the web root
COPY . /var/www/html

# Duplicate paths.config.js to paths.js if paths.js does not exist
RUN [ ! -f /var/www/html/var/paths.js ] && cp /var/www/html/var/paths.config.js /var/www/html/var/paths.js || echo "paths.js already exists."

# Replace placeholder in paths.js with environment variable value
RUN sed -i 's|const projectURL = ".*";|const projectURL = "http://localhost:8081/";|g' /var/www/html/var/paths.js

# Ensure the correct permissions
RUN chown -R www-data:www-data /var/www/html
RUN chmod -R 755 /var/www/html

# Set working directory
WORKDIR /var/www/html

# Expose port 8081
EXPOSE 8081

# Start Nginx and PHP-FPM
CMD ["sh", "-c", "php-fpm & nginx -g 'daemon off;'"]
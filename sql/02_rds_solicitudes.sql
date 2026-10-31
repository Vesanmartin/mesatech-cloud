-- Ejecutar en la RDS de SOLICITUDES (mesatech-solicitudes-db), OTRA instancia distinta, desde la EC2 B:
--   mysql -h <endpoint-solicitudes> -u admin -p < 02_rds_solicitudes.sql
-- Reemplazar CAMBIAR_CLAVE antes de ejecutar y NO guardar este archivo con la clave real.

CREATE DATABASE IF NOT EXISTS solicitudes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'app_solicitudes'@'%' IDENTIFIED BY 'CAMBIAR_CLAVE';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON solicitudes.* TO 'app_solicitudes'@'%';
FLUSH PRIVILEGES;

USE solicitudes;

-- Copia local de categorias recibidas por RabbitMQ (categoria_id = id de origen en Catalogo)
CREATE TABLE IF NOT EXISTS categorias_locales (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    categoria_id    BIGINT       NOT NULL,
    nombre          VARCHAR(255) NOT NULL,
    event_id        VARCHAR(36)  NOT NULL,
    fecha_evento    VARCHAR(40)  NOT NULL,
    fecha_recepcion DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_categorias_locales_origen UNIQUE (categoria_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitudes (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    titulo         VARCHAR(255) NOT NULL,
    descripcion    VARCHAR(255) NOT NULL,
    categoria_id   BIGINT       NULL,
    categoria      VARCHAR(255) NULL,
    prioridad      VARCHAR(255) NULL,
    usuario_id     VARCHAR(255) NULL,
    estado         VARCHAR(20)  NULL,
    fecha_creacion DATETIME(6)  NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Consultas de evidencia
-- SELECT categoria_id, nombre, event_id, fecha_recepcion FROM categorias_locales ORDER BY id DESC;
-- SELECT id, titulo, categoria_id, categoria, estado FROM solicitudes ORDER BY id DESC;

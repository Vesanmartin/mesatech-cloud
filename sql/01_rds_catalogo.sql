-- Ejecutar en la RDS de CATALOGO (mesatech-catalogo-db) desde la EC2 A, conectada como admin:
--   mysql -h <endpoint-catalogo> -u admin -p < 01_rds_catalogo.sql
-- Reemplazar CAMBIAR_CLAVE antes de ejecutar y NO guardar este archivo con la clave real.

CREATE DATABASE IF NOT EXISTS catalogo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usuario de aplicacion: solo trabaja en su base, no es administrador
CREATE USER IF NOT EXISTS 'app_catalogo'@'%' IDENTIFIED BY 'CAMBIAR_CLAVE';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON catalogo.* TO 'app_catalogo'@'%';
FLUSH PRIVILEGES;

USE catalogo;

-- Misma estructura que crea Hibernate (ddl-auto=update); se deja para que sea reproducible
CREATE TABLE IF NOT EXISTS categorias (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) NULL,
    activo      BIT          NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prioridades (
    id     BIGINT       NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    nivel  INT          NULL,
    activo BIT          NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Consultas de evidencia
-- SELECT id, nombre, descripcion FROM categorias ORDER BY id DESC;

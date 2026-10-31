# MesaTech Cloud · DSY1107 Desarrollo Cloud Native I

Continuación de la EP1 (React + MSAL, Microsoft Entra ID, AWS API Gateway, BFF con JWT, v1 y v2).
La EP2 agrega **dos RDS independientes** y **mensajería con RabbitMQ**: cuando un administrador crea una
categoría, **ms-catalogo** la guarda en su RDS y publica un evento; **ms-solicitudes** lo consume y guarda
una **copia local** en su propia RDS, que se usa al registrar solicitudes.

```
React (MSAL) → API Gateway → BFF (EC2 A) → ms-catalogo (EC2 A) → RDS Catálogo
                                           ms-catalogo ──publica──► catalogo.exchange ──categoria.creada──► solicitudes.catalogo.queue  (RabbitMQ, EC2 C)
                                                                                                                │ consume
React (MSAL) → API Gateway → BFF (EC2 A) → ms-solicitudes (EC2 B) ◄──────────────────────────────────────────────┘ → RDS Solicitudes
```

| Componente | Ubicación | Publica / consume | Base de datos propia |
|---|---|---|---|
| ms-catalogo (puerto 8082) | EC2 A | **Publica** `CATEGORIA_CREADA` | RDS `mesatech-catalogo-db` (base `catalogo`) |
| ms-solicitudes (puerto 8081) | EC2 B | **Consume** `CATEGORIA_CREADA` | RDS `mesatech-solicitudes-db` (base `solicitudes`) |
| RabbitMQ 4.2 (Docker Compose) | EC2 C (Ubuntu 24.04) | Broker | — (volumen `mesatech_rabbitmq_data`) |
| BFF (puerto 8080) | EC2 A | No accede a RDS ni a RabbitMQ | — |
| frontend React | Local (`localhost:3000`) | — | — |

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `frontend/` | React + MSAL. Pantalla de categorías (solo `ROLE_ADMINISTRADOR`) y solicitudes con categorías disponibles |
| `bff/` | Validación JWT de Entra ID, roles, v1 y v2, proxy hacia los microservicios |
| `ms-catalogo/` | Categorías y prioridades. **Publicador** RabbitMQ (`event/CategoriaPublisher`) |
| `ms-solicitudes/` | Solicitudes y estados. **Consumidor** RabbitMQ (`event/CategoriaListener`) y copia local `categorias_locales` |
| `rabbitmq/` | `compose.yaml`, `.env.example`, definiciones (vhost, exchange, cola, binding) y script de usuarios/permisos |
| `sql/` | Bases, usuarios de aplicación y tablas de cada RDS |
| `deploy/` | Servicio systemd para los componentes Java |
| `docs/contrato-evento.md` | Contrato del evento `CATEGORIA_CREADA` |

## Versiones

| Componente | Versión |
|---|---|
| Java | 21 (OpenJDK / Temurin) |
| Spring Boot | 4.1.1 |
| RabbitMQ | imagen oficial `rabbitmq:4.2-management` (4.2.9) |
| Docker Engine / Compose plugin | 29.9.2 / v5.6.1 |
| SO EC2 | Ubuntu Server 24.04 LTS |
| RDS | MySQL 8.4.11, puerto 3306, `db.t4g.micro`, sin acceso público |
| Node.js (frontend) | 20 o superior |

## Red: security groups

| Destino | Puerto | Origen autorizado | Uso |
|---|---|---|---|
| EC2 C (RabbitMQ) | 5672 | SG de EC2 A y SG de EC2 B | AMQP por red privada |
| EC2 C (RabbitMQ) | 15672 | IP administrativa /32 | Panel de administración |
| RDS Catálogo | 3306 | SG de EC2 A (`ec2-rds-1` → `rds-ec2-1`) | Solo ms-catalogo |
| RDS Solicitudes | 3306 | SG de EC2 B (`ec2-rds-2` → `rds-ec2-2`) | Solo ms-solicitudes |
| EC2 A, B, C | 22 | IP administrativa /32 | SSH |
| EC2 B | 8081 | SG de EC2 A | BFF → ms-solicitudes por red privada |
| EC2 A | 8080 | Integración de API Gateway (EP1) | API Gateway → BFF |

Los microservicios se conectan a RabbitMQ y entre sí por **IP privada** (no cambia al reiniciar el Learner Lab).

## 1. RabbitMQ (EC2 C)

```bash
cd ~/rabbitmq
cp .env.example .env && nano .env && chmod 600 .env
docker compose config --quiet      # valida el archivo (sin salida = OK)
docker compose pull                # descarga la imagen
docker compose up -d               # arranca
docker compose ps                  # estado (healthy)
docker compose logs --tail 50 rabbitmq
docker exec rabbitmq rabbitmq-diagnostics status
bash crear-recursos.sh             # vhost, exchange, cola, binding, usuarios y permisos
```

## 2. Bases de datos

`sql/01_rds_catalogo.sql` se ejecuta desde la **EC2 A** y `sql/02_rds_solicitudes.sql` desde la **EC2 B**
(las RDS no son públicas):

```bash
sudo apt-get install -y mysql-client
mysql -h <endpoint-rds> -u admin -p < 01_rds_catalogo.sql
```

## 3. Compilar (en el PC)

```bash
cd ms-catalogo    && ./mvnw clean package -DskipTests   # target/ms-catalogo-0.0.1-SNAPSHOT.jar
cd ms-solicitudes && ./mvnw clean package -DskipTests
cd bff            && ./mvnw clean package -DskipTests
```

En Windows: `mvnw.cmd clean package -DskipTests`.

## 4. Desplegar un componente (EC2 A: ms-catalogo y bff · EC2 B: ms-solicitudes)

```bash
# en la EC2
sudo apt-get update && sudo apt-get install -y openjdk-21-jre-headless
sudo mkdir -p /opt/mesatech && sudo chown ubuntu:ubuntu /opt/mesatech
mv /tmp/ms-catalogo-*.jar /opt/mesatech/ms-catalogo.jar
cp /tmp/.env.example /opt/mesatech/ms-catalogo.env && nano /opt/mesatech/ms-catalogo.env && chmod 600 /opt/mesatech/ms-catalogo.env
sed 's/NOMBRE_MS/ms-catalogo/g' /tmp/mesatech-ms.service | sudo tee /etc/systemd/system/ms-catalogo.service
sudo systemctl daemon-reload && sudo systemctl enable --now ms-catalogo
journalctl -u ms-catalogo -f
```

Cada componente usa su propio archivo de variables (`ms-catalogo.env`, `ms-solicitudes.env`, `bff.env`);
ver el `.env.example` de cada carpeta.

## Arranque, detención y recuperación

Orden de arranque: **RDS → RabbitMQ (EC2 C) → ms-solicitudes (EC2 B) → ms-catalogo (EC2 A) → BFF (EC2 A) → frontend**.

| Acción | Comando |
|---|---|
| Detener / iniciar un componente | `sudo systemctl stop ms-solicitudes` / `start` |
| Estado y logs | `systemctl status ms-catalogo` · `journalctl -u ms-catalogo -f` |
| Detener / iniciar el broker (conserva volumen) | `docker compose stop` / `docker compose start` |
| Recrear el contenedor (prueba P5) | `docker compose up -d --force-recreate` (**nunca** `down -v`) |

## Endpoints

| Servicio | Método y ruta | Rol | Respuesta |
|---|---|---|---|
| BFF → ms-catalogo | `POST /v1/categorias` `{"nombre","descripcion"}` | ADMINISTRADOR | 201 guardada y publicada · 503 guardada sin evento |
| BFF → ms-catalogo | `GET /v1/categorias` | autenticado | categorías originales |
| BFF → ms-solicitudes | `GET /v1/categorias-disponibles` | autenticado | copia local recibida por RabbitMQ |
| BFF → ms-solicitudes | `POST /v1/solicitudes` `{"titulo","descripcion","categoriaId","prioridad"}` | autenticado | 200 · 422 si la categoría aún no llega |
| BFF → ms-solicitudes | `GET /v1/solicitudes/mias` · `GET /v1/solicitudes` | autenticado · OPERADOR/ADMINISTRADOR | — |
| BFF → ms-solicitudes | `PATCH /v1/solicitudes/{id}/estado?nuevoEstado=` | OPERADOR/ADMINISTRADOR | 400 si RESUELTA sin EN_PROCESO |
| BFF | `GET /v2/solicitudes` | autenticado | v2 con solicitante como objeto |

## Límites conocidos

Guardar en la RDS de Catálogo y publicar el evento son operaciones separadas: si RabbitMQ no confirma,
la categoría queda guardada pero no llega a Solicitudes (respuesta 503 con `categoriaGuardada=true`) y
debe republicarse manualmente. Si un mensaje se entrega dos veces, el consumidor no duplica la copia
(`categoria_id` único), pero no existe garantía de procesamiento exactamente una vez. No se implementan
outbox, DLQ ni reintentos avanzados (fuera del alcance de la EP2).

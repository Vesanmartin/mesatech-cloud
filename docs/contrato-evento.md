# Contrato del evento CATEGORIA_CREADA

| Elemento | Valor |
|---|---|
| Publicador | ms-catalogo (EC2 A), usuario `catalogo_publicador` |
| Virtual host | `mesatech` |
| Exchange | `catalogo.exchange` (direct, durable) |
| Routing key | `categoria.creada` |
| Cola | `solicitudes.catalogo.queue` (durable, sin autoeliminación) |
| Consumidor | ms-solicitudes (EC2 B), usuario `solicitudes_consumidor` |
| Formato | JSON, `content_type=application/json`, `delivery_mode=2` (persistente) |
| messageId AMQP | igual a `eventId` |

## Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `eventId` | String (UUID v4) | Identificador único del evento, generado por Catálogo |
| `tipoEvento` | String | Siempre `CATEGORIA_CREADA` |
| `fechaEvento` | String (ISO-8601, UTC) | Momento de la publicación, ej. `2026-11-03T23:15:30.123456Z` |
| `categoriaId` | Long | Id de la categoría en la RDS de Catálogo. Solicitudes lo conserva en `categorias_locales.categoria_id` |
| `nombre` | String (máx. 100) | Nombre de la categoría |

## Ejemplo (reemplazar por uno real capturado en la prueba P2)

```json
{
  "eventId": "3f2b7c1e-8a4d-4f6b-9b1e-2c5d7e9f0a12",
  "tipoEvento": "CATEGORIA_CREADA",
  "fechaEvento": "2026-11-03T23:15:30.123456Z",
  "categoriaId": 1,
  "nombre": "Soporte de impresoras"
}
```

## Trazabilidad para las evidencias

POST `/v1/categorias` (desde React → API Gateway → BFF → ms-catalogo) → respuesta 201 con el `id` de la categoría (= `categoriaId` del evento) → log de ms-catalogo `Evento publicado y confirmado: eventId=... categoriaId=...` → mensaje en la cola (messageId = eventId) → log de ms-solicitudes `Copia guardada en RDS Solicitudes: categoriaId=... eventId=...` → fila en `categorias_locales` con el mismo `categoria_id` y `event_id`.

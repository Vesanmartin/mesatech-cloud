package cl.duoc.mesatechcloud.ms_catalogo.event;

/**
 * Contrato del evento publicado en RabbitMQ (ver docs/contrato-evento.md).
 *
 * eventId      String  UUID v4 generado por Catalogo; tambien es el messageId de AMQP.
 * tipoEvento   String  Siempre "CATEGORIA_CREADA".
 * fechaEvento  String  Fecha y hora UTC en ISO-8601 (ej: 2026-11-03T21:15:30.123Z).
 * categoriaId  Long    Id de la categoria en la RDS de Catalogo (referencia de origen).
 * nombre       String  Nombre de la categoria.
 */
public record CategoriaCreadaEvento(
        String eventId,
        String tipoEvento,
        String fechaEvento,
        Long categoriaId,
        String nombre
) {
    public static final String TIPO = "CATEGORIA_CREADA";
}

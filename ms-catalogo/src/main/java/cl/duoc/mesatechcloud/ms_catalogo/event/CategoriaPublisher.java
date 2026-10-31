package cl.duoc.mesatechcloud.ms_catalogo.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Publica el evento y ESPERA la confirmacion del broker (publisher confirm).
 * - ack=true  -> RabbitMQ acepto el mensaje (NO significa que Solicitudes ya lo guardo).
 * - ack=false o timeout -> no hay garantia de que el mensaje este en el broker.
 * - returned  -> el broker lo recibio pero ninguna cola estaba enlazada a la routing key.
 */
@Component
public class CategoriaPublisher {

    private static final Logger log = LoggerFactory.getLogger(CategoriaPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;
    private final String routingKey;

    public CategoriaPublisher(RabbitTemplate rabbitTemplate,
                              @Value("${app.rabbitmq.exchange}") String exchange,
                              @Value("${app.rabbitmq.routing-key}") String routingKey) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = exchange;
        this.routingKey = routingKey;
    }

    public void publicar(CategoriaCreadaEvento evento) {
        CorrelationData correlation = new CorrelationData(evento.eventId());

        rabbitTemplate.convertAndSend(exchange, routingKey, evento, message -> {
            message.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
            message.getMessageProperties().setMessageId(evento.eventId());
            message.getMessageProperties().setType(evento.tipoEvento());
            return message;
        }, correlation);

        try {
            CorrelationData.Confirm confirm = correlation.getFuture().get(10, TimeUnit.SECONDS);

            if (!confirm.ack()) {
                throw new AmqpException("RabbitMQ no confirmo la publicacion: " + confirm.reason());
            }
            if (correlation.getReturned() != null) {
                throw new AmqpException("RabbitMQ no encontro una cola para la routing key " + routingKey);
            }
            log.info("Evento publicado y confirmado: eventId={} categoriaId={} exchange={} routingKey={}",
                    evento.eventId(), evento.categoriaId(), exchange, routingKey);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AmqpException("Se interrumpio la espera de confirmacion", e);
        } catch (ExecutionException | TimeoutException e) {
            throw new AmqpException("No se pudo confirmar la publicacion en RabbitMQ", e);
        }
    }
}

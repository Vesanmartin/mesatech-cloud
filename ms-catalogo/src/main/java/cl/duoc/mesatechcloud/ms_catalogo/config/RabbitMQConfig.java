package cl.duoc.mesatechcloud.ms_catalogo.config;

import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * El exchange, la cola y el binding NO se declaran aqui: se crean en el broker
 * (rabbitmq/definiciones/mesatech.json). Si no existen, la publicacion falla y se
 * responde con un error controlado en vez de esconder el problema.
 */
@Configuration
public class RabbitMQConfig {

    // Envia el evento como JSON (content-type application/json)
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}

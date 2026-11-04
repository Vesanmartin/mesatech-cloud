package cl.duoc.mesatechcloud.bff.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Consulta en tiempo real las métricas oficiales de la cola solicitudes.catalogo.queue
 * desde el Management API de RabbitMQ en EC2 C (puerto 15672).
 */
@RestController
@RequestMapping("/v1/cola/metricas")
public class RabbitMQMetricasController {

    private static final Logger log = LoggerFactory.getLogger(RabbitMQMetricasController.class);

    private final RestTemplate restTemplate;
    private final String rabbitApiUrl;
    private final String user;
    private final String password;

    public RabbitMQMetricasController(
            RestTemplate restTemplate,
            @Value("${app.rabbitmq.management.url:http://172.31.17.146:15672}") String rabbitMgmtUrl,
            @Value("${app.rabbitmq.management.user:admin}") String user,
            @Value("${app.rabbitmq.management.password:RabbitMQ2026!}") String password,
            @Value("${app.rabbitmq.virtual-host:mesatech}") String vhost,
            @Value("${app.rabbitmq.queue:solicitudes.catalogo.queue}") String queue) {

        this.restTemplate = restTemplate;
        this.user = user;
        this.password = password;
        this.rabbitApiUrl = String.format("%s/api/queues/%s/%s", rabbitMgmtUrl, vhost, queue);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> obtenerMetricas() {
        Map<String, Object> respuesta = new LinkedHashMap<>();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBasicAuth(user, password);
            HttpEntity<?> request = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(rabbitApiUrl, HttpMethod.GET, request, Map.class);
            Map<?, ?> raw = response.getBody();

            if (raw != null) {
                int ready = raw.get("messages_ready") instanceof Number n ? n.intValue() : 0;
                int unacked = raw.get("messages_unacknowledged") instanceof Number n ? n.intValue() : 0;
                int consumers = raw.get("consumers") instanceof Number n ? n.intValue() : 0;
                int total = raw.get("messages") instanceof Number n ? n.intValue() : 0;
                Object stateObj = raw.get("state");
                String state = stateObj != null ? stateObj.toString() : "idle";

                respuesta.put("ready", ready);
                respuesta.put("unacked", unacked);
                respuesta.put("consumers", consumers);
                respuesta.put("total", total);
                respuesta.put("activo", consumers > 0);
                respuesta.put("state", state);
                return ResponseEntity.ok(respuesta);
            }
        } catch (Exception e) {
            log.warn("No se pudo consultar RabbitMQ Management API en {}: {}", rabbitApiUrl, e.getMessage());
        }

        respuesta.put("ready", 0);
        respuesta.put("unacked", 0);
        respuesta.put("consumers", 0);
        respuesta.put("total", 0);
        respuesta.put("activo", false);
        respuesta.put("state", "unreachable");
        return ResponseEntity.ok(respuesta);
    }
}

package cl.duoc.mesatechcloud.bff.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

/**
 * EP2: categorias que ya llegaron a Solicitudes por RabbitMQ (copia local).
 * Es lo que React usa para saber si una categoria nueva ya se puede usar en una solicitud.
 * Cualquier usuario autenticado puede consultarlas.
 */
@RestController
@RequestMapping("/v1/categorias-disponibles")
public class CategoriaDisponibleProxyController {

    private final RestTemplate restTemplate;

    @Value("${ms.solicitudes.url}")
    private String msSolicitudesUrl;

    public CategoriaDisponibleProxyController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping
    public ResponseEntity<Object> listar() {
        return restTemplate.getForEntity(msSolicitudesUrl + "/v1/categorias-disponibles", Object.class);
    }
}

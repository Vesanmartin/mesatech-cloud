package cl.duoc.mesatechcloud.bff.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/v1/prioridades")
public class PrioridadProxyController {

    private final RestTemplate restTemplate;

    @Value("${ms.catalogo.url}")
    private String msCatalogoUrl;

    public PrioridadProxyController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping
    public ResponseEntity<Object> listar() {
        return restTemplate.getForEntity(msCatalogoUrl + "/v1/prioridades", Object.class);
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @PostMapping
    public ResponseEntity<Object> crear(@RequestBody Object prioridad) {
        return restTemplate.postForEntity(msCatalogoUrl + "/v1/prioridades", prioridad, Object.class);
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @PutMapping("/{id}")
    public ResponseEntity<Object> actualizar(@PathVariable Long id, @RequestBody Object prioridad) {
        HttpEntity<Object> request = new HttpEntity<>(prioridad);
        return restTemplate.exchange(msCatalogoUrl + "/v1/prioridades/" + id, HttpMethod.PUT, request, Object.class);
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        restTemplate.delete(msCatalogoUrl + "/v1/prioridades/" + id);
        return ResponseEntity.noContent().build();
    }
}
package cl.duoc.mesatechcloud.bff.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/v1/solicitudes")
public class SolicitudProxyController {

    private final RestTemplate restTemplate;

    @Value("${ms.solicitudes.url}")
    private String msSolicitudesUrl;

    public SolicitudProxyController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostMapping
    public ResponseEntity<Object> crear(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        String usuarioId = jwt.getClaimAsString("preferred_username");
        body.put("usuarioId", usuarioId);

        return restTemplate.postForEntity(msSolicitudesUrl + "/v1/solicitudes", body, Object.class);
    }

    @GetMapping("/mias")
    public ResponseEntity<Object> listarMias(@AuthenticationPrincipal Jwt jwt) {
        String usuarioId = jwt.getClaimAsString("preferred_username");
        String url = msSolicitudesUrl + "/v1/solicitudes/mias?usuarioId=" + usuarioId;
        return restTemplate.getForEntity(url, Object.class);
    }

    @PreAuthorize("hasAnyRole('OPERADOR','ADMINISTRADOR')")
    @GetMapping
    public ResponseEntity<Object> listarTodas() {
        return restTemplate.getForEntity(msSolicitudesUrl + "/v1/solicitudes", Object.class);
    }

    @PreAuthorize("hasAnyRole('OPERADOR','ADMINISTRADOR')")
    @PatchMapping("/{id}/estado")
    public ResponseEntity<Object> cambiarEstado(@PathVariable Long id, @RequestParam String nuevoEstado) {
        String url = msSolicitudesUrl + "/v1/solicitudes/" + id + "/estado?nuevoEstado=" + nuevoEstado;
        try {
            ResponseEntity<Object> respuesta = restTemplate.exchange(url, HttpMethod.PATCH, null, Object.class);
            return ResponseEntity.status(respuesta.getStatusCode()).body(respuesta.getBody());
        } catch (HttpClientErrorException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(ex.getResponseBodyAsString());
        }
    }
}
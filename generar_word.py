import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_code_block(doc, code_text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "2D3748") # Dark slate
    set_cell_margins(cell, top=110, bottom=110, left=160, right=160)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="3182CE"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(code_text.strip())
    run.font.name = 'Consolas'
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(226, 232, 240)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_callout_box(doc, title, text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "EBF8FF") # Light blue alert
    set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="3182CE"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    r1 = p.add_run(f"📌 {title}\n")
    r1.bold = True
    r1.font.size = Pt(10)
    r1.font.color.rgb = RGBColor(43, 108, 176)
    r2 = p.add_run(text)
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = RGBColor(45, 55, 72)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def create_guide_docx(filename):
    doc = docx.Document()
    
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = RGBColor(45, 55, 72)

    # Titulo Principal
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    r_title = title_p.add_run("MesaTech Cloud - Guía de Despliegue AWS y Pruebas (EP2)")
    r_title.bold = True
    r_title.font.size = Pt(20)
    r_title.font.color.rgb = RGBColor(26, 54, 93)

    # Subtitulo
    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(12)
    r_sub = sub_p.add_run("Asignatura: DSY1107 - Desarrollo Cloud Native I | Duoc UC\n"
                          "Arquitectura: 3 EC2 + 2 Amazon RDS MySQL + RabbitMQ + BFF + React en AWS")
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = RGBColor(113, 128, 150)

    # Line separator
    p_line = doc.add_paragraph()
    p_line.paragraph_format.space_after = Pt(8)
    r_line = p_line.add_run("―" * 58)
    r_line.font.color.rgb = RGBColor(203, 213, 225)

    # Nota importante sobre IPs dinámicas de AWS Learner Lab
    add_callout_box(doc, 
        "Nota Crucial sobre las IPs Públicas en AWS Learner Lab",
        "En AWS Learner Lab, cuando las instancias EC2 se apagan, pausan o reinician, AWS les asigna una NUEVA IP pública automáticamente. "
        "Las IPs privadas (172.31.X.X) NO cambian y son estables entre las instancias. "
        "Para conocer la IP pública actual de cualquier EC2 en cualquier momento, basta ejecutar en su terminal: curl -s checkip.amazonaws.com "
        "Si la IP pública de EC2 A cambia, se debe actualizar el Redirect URI en Microsoft Entra ID (Azure) para que el botón de login funcione.")

    # 1. Resumen de Recursos AWS y Credenciales
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("1. Resumen de Recursos en AWS y Credenciales Estandarizadas")
    r_h1.bold = True
    r_h1.font.size = Pt(14)
    r_h1.font.color.rgb = RGBColor(43, 108, 176)

    table = doc.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    headers = ["Instancia / Recurso", "Rol y Componentes", "Dirección / Endpoint", "Puertos Abiertos"]
    widths = [Inches(1.5), Inches(1.6), Inches(2.1), Inches(1.3)]
    
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        hdr_cells[i].width = widths[i]
        set_cell_background(hdr_cells[i], "2B6CB0")
        set_cell_margins(hdr_cells[i], top=70, bottom=70, left=90, right=90)
        p = hdr_cells[i].paragraphs[0]
        p.runs[0].font.bold = True
        p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
        p.runs[0].font.size = Pt(9.5)

    data = [
        ("EC2 A (Gateway & Catálogo)", "BFF API Gateway (8080)\nms-catalogo (8082)", "IP Privada: 172.31.24.16\nIP Pública: 3.84.111.84", "22 (SSH)\n8080 (BFF - 0.0.0.0/0)\n8082 (172.31.0.0/16)"),
        ("EC2 B (Solicitudes)", "ms-solicitudes (8081)\nConsumidor RabbitMQ", "IP Privada: 172.31.29.191\nIP Pública: 184.73.123.56", "22 (SSH)\n8081 (172.31.0.0/16)"),
        ("EC2 C (RabbitMQ)", "Broker RabbitMQ (5672)\nDashboard Web (15672)", "IP Privada: 172.31.17.146\nIP Pública: 34.227.193.103", "22 (SSH)\n5672 (172.31.0.0/16)\n15672 (0.0.0.0/0)"),
        ("RDS Catálogo", "Base MySQL Exclusiva\n(Sin acceso público)", "mesatech-catalogo-db.c1okasyq2r7x.us-east-1.rds.amazonaws.com", "3306 (MySQL)\nSolo desde EC2 A"),
        ("RDS Solicitudes", "Base MySQL Exclusiva\n(Sin acceso público)", "mesatech-rds-solicitudes-sg.c1okasyq2r7x.us-east-1.rds.amazonaws.com", "3306 (MySQL)\nSolo desde EC2 B"),
        ("Frontend (Local)", "React 18 SPA con MSAL Azure AD\nConectado al BFF en AWS", "http://localhost:3000\n(BFF: http://3.84.111.84:8080)", "3000 (React Dev Server)")
    ]

    for row_idx, row_data in enumerate(data):
        row = table.add_row()
        bg_col = "F7FAFC" if row_idx % 2 == 0 else "FFFFFF"
        for col_idx, text in enumerate(row_data):
            cell = row.cells[col_idx]
            cell.text = text
            cell.width = widths[col_idx]
            set_cell_background(cell, bg_col)
            set_cell_margins(cell, top=50, bottom=50, left=70, right=70)
            p = cell.paragraphs[0]
            p.runs[0].font.size = Pt(8.5)
            p.runs[0].font.color.rgb = RGBColor(45, 55, 72)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)


    p_nota_front = doc.add_paragraph()
    r_nf = p_nota_front.add_run("Nota de Arquitectura sobre la Ejecución del Frontend:\n")
    r_nf.bold = True
    r_nf.font.color.rgb = RGBColor(43, 108, 176)
    p_nota_front.add_run(
        "Para garantizar la compatibilidad criptográfica obligatoria de la biblioteca MSAL (Microsoft Authentication Library) "
        "y dar cumplimiento estricto a las políticas de seguridad de Microsoft Entra ID institucional, la aplicación cliente React "
        "se ejecuta localmente en http://localhost:3000. Los navegadores modernos bloquean la API nativa window.crypto.subtle "
        "cuando se accede por protocolo HTTP sobre direcciones IP públicas sin certificado SSL/TLS de confianza. "
        "Por esta razón, la arquitectura desacoplada opera de manera híbrida y profesional: el frontend corre en localhost:3000 "
        "consumiendo de forma transparente toda la infraestructura Cloud Native en AWS (EC2 A para el BFF Gateway y ms-catalogo, "
        "EC2 B para ms-solicitudes, EC2 C para el broker RabbitMQ y dos instancias Amazon RDS MySQL independientes)."
    )

    # Credenciales Estandarizadas
    p_cred = doc.add_paragraph()
    p_cred.add_run("Credenciales y Parámetros del Sistema:").bold = True
    p_cred.paragraph_format.space_after = Pt(2)

    cred_bullets = [
        "URL de Acceso a la Aplicación (Frontend): http://localhost:3000",
        "URL del Gateway BFF en AWS: http://3.84.111.84:8080",
        "RabbitMQ Admin Web: admin / RabbitMQ2026! (URL: http://34.227.193.103:15672)",
        "Usuario Maestro RDS: admin (clave definida en consola)",
        "Usuario Aplicación RDS Catálogo: app_catalogo / CatalogoDbPass2026! (DB: catalogo)",
        "Usuario Aplicación RDS Solicitudes: app_solicitudes / SolicitudesDbPass2026! (DB: solicitudes)",
        "RabbitMQ Publicador: catalogo_publicador / CatalogoPass2026! (vHost: mesatech)",
        "RabbitMQ Consumidor: solicitudes_consumidor / SolicitudesPass2026! (vHost: mesatech)",
        "Repositorio Git: https://github.com/Vesanmartin/mesatech-cloud.git (Rama: ep2-frontend-roles)"
    ]
    for b in cred_bullets:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_before = Pt(1)
        bp.paragraph_format.space_after = Pt(1)
        run = bp.add_run(b)
        run.font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 2. Comandos EC2 C
    h2 = doc.add_heading(level=1)
    r_h2 = h2.add_run("2. Comandos en EC2 C (Servidor de Mensajería RabbitMQ)")
    r_h2.bold = True
    r_h2.font.size = Pt(13)
    r_h2.font.color.rgb = RGBColor(43, 108, 176)

    doc.add_paragraph("Conectarse por EC2 Instance Connect a EC2 C y ejecutar:")

    c_cmd = """# 1. Instalar Docker y Docker Compose
sudo apt update -y && sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu

# 2. Crear archivo docker-compose.yml
mkdir -p ~/rabbitmq && cd ~/rabbitmq
cat << 'EOF' > docker-compose.yml
services:
  rabbitmq:
    image: rabbitmq:3.13-management
    container_name: rabbitmq-mesatech
    restart: always
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: RabbitMQ2026!
EOF

# 3. Iniciar contenedor de RabbitMQ
sudo docker compose up -d

# 4. Configurar vHost, Usuarios Segregados, Exchange, Cola y Binding
C=rabbitmq-mesatech
VHOST=mesatech

# Crear vhost y asignar permisos a admin
sudo docker exec "$C" rabbitmqctl add_vhost "$VHOST"
sudo docker exec "$C" rabbitmqctl set_permissions -p "$VHOST" admin '.*' '.*' '.*'

# Usuario publicador (solo escribe en catalogo.exchange)
sudo docker exec "$C" rabbitmqctl add_user catalogo_publicador CatalogoPass2026!
sudo docker exec "$C" rabbitmqctl set_user_tags catalogo_publicador
sudo docker exec "$C" rabbitmqctl set_permissions -p "$VHOST" catalogo_publicador '^$' '^catalogo\\.exchange$' '^$'

# Usuario consumidor (solo lee de solicitudes.catalogo.queue)
sudo docker exec "$C" rabbitmqctl add_user solicitudes_consumidor SolicitudesPass2026!
sudo docker exec "$C" rabbitmqctl set_user_tags solicitudes_consumidor
sudo docker exec "$C" rabbitmqctl set_permissions -p "$VHOST" solicitudes_consumidor '^$' '^$' '^solicitudes\\.catalogo\\.queue$'

# Declarar Exchange, Cola y Binding
sudo docker exec "$C" rabbitmqadmin declare exchange --vhost="$VHOST" -u admin -p RabbitMQ2026! name=catalogo.exchange type=direct durable=true
sudo docker exec "$C" rabbitmqadmin declare queue --vhost="$VHOST" -u admin -p RabbitMQ2026! name=solicitudes.catalogo.queue durable=true
sudo docker exec "$C" rabbitmqadmin declare binding --vhost="$VHOST" -u admin -p RabbitMQ2026! source=catalogo.exchange destination=solicitudes.catalogo.queue routing_key=categoria.creada

# 5. Comprobación de estado y URL del Dashboard Web
sudo docker exec "$C" rabbitmqctl list_queues -p "$VHOST" name durable
curl -I http://localhost:15672
# Dashboard disponible en: http://34.227.193.103:15672 (admin / RabbitMQ2026!)"""
    add_code_block(doc, c_cmd)

    # 3. Comandos EC2 B
    h3 = doc.add_heading(level=1)
    r_h3 = h3.add_run("3. Comandos en EC2 B (Microservicio ms-solicitudes)")
    r_h3.bold = True
    r_h3.font.size = Pt(13)
    r_h3.font.color.rgb = RGBColor(43, 108, 176)

    doc.add_paragraph("Conectarse por EC2 Instance Connect a EC2 B y ejecutar:")

    b_cmd = """# 1. Instalar dependencias base y Java 21
sudo apt update -y && sudo apt install -y default-mysql-client openjdk-21-jdk git
sudo update-alternatives --set java $(update-alternatives --list java | grep 21 | head -n 1)
sudo update-alternatives --set javac $(update-alternatives --list javac | grep 21 | head -n 1)

# 2. Inicializar base de datos RDS Solicitudes (ingresar clave admin al pedirla)
mysql -h mesatech-rds-solicitudes-sg.c1okasyq2r7x.us-east-1.rds.amazonaws.com -u admin -p << 'EOF'
CREATE DATABASE IF NOT EXISTS solicitudes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'app_solicitudes'@'%' IDENTIFIED BY 'SolicitudesDbPass2026!';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON solicitudes.* TO 'app_solicitudes'@'%';
FLUSH PRIVILEGES;

USE solicitudes;
CREATE TABLE IF NOT EXISTS categorias_locales (
    id BIGINT NOT NULL AUTO_INCREMENT,
    categoria_id BIGINT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    fecha_evento VARCHAR(40) NOT NULL,
    fecha_recepcion DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_categorias_locales_origen UNIQUE (categoria_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitudes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    titulo VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    categoria_id BIGINT NULL,
    categoria VARCHAR(255) NULL,
    prioridad VARCHAR(255) NULL,
    usuario_id VARCHAR(255) NULL,
    estado VARCHAR(20) NULL,
    fecha_creacion DATETIME(6) NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;
EOF

# 3. Clonar repositorio desde la rama ep2-frontend-roles
cd ~
git clone -b ep2-frontend-roles https://github.com/Vesanmartin/mesatech-cloud.git
cd mesatech-cloud

# 4. Crear .env para ms-solicitudes
cat << 'EOF' > ms-solicitudes/.env
SERVER_PORT=8081
DB_URL=jdbc:mysql://mesatech-rds-solicitudes-sg.c1okasyq2r7x.us-east-1.rds.amazonaws.com:3306/solicitudes
DB_USER=app_solicitudes
DB_PASSWORD=SolicitudesDbPass2026!
RABBIT_HOST=172.31.17.146
RABBIT_PORT=5672
RABBIT_VHOST=mesatech
RABBIT_USER=solicitudes_consumidor
RABBIT_PASSWORD=SolicitudesPass2026!
EOF

# 5. Compilar y ejecutar ms-solicitudes en segundo plano
cd ~/mesatech-cloud/ms-solicitudes
chmod +x mvnw
./mvnw clean package -DskipTests
nohup java -jar target/*.jar --spring.config.import=optional:file:.env[.properties] > solicitudes.log 2>&1 &

# 6. Validar proceso y verificar IP privada (172.31.29.191)
sleep 5
ps aux | grep java
echo "IP Privada de EC2 B: $(hostname -I | awk '{print $1}')\""""
    add_code_block(doc, b_cmd)

    # 4. Comandos EC2 A
    h4 = doc.add_heading(level=1)
    r_h4 = h4.add_run("4. Comandos en EC2 A (ms-catalogo, BFF y Frontend React en Puerto 80)")
    r_h4.bold = True
    r_h4.font.size = Pt(13)
    r_h4.font.color.rgb = RGBColor(43, 108, 176)

    doc.add_paragraph("Conectarse por EC2 Instance Connect a EC2 A y ejecutar:")

    a_cmd = """# 1. Instalar dependencias base, Java 21 y Node.js 20 LTS
sudo apt update -y && sudo apt install -y default-mysql-client openjdk-21-jdk git
sudo update-alternatives --set java $(update-alternatives --list java | grep 21 | head -n 1)
sudo update-alternatives --set javac $(update-alternatives --list javac | grep 21 | head -n 1)

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g serve

# 2. Inicializar base de datos RDS Catálogo (ingresar clave admin al pedirla)
mysql -h mesatech-catalogo-db.c1okasyq2r7x.us-east-1.rds.amazonaws.com -u admin -p << 'EOF'
CREATE DATABASE IF NOT EXISTS catalogo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'app_catalogo'@'%' IDENTIFIED BY 'CatalogoDbPass2026!';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON catalogo.* TO 'app_catalogo'@'%';
FLUSH PRIVILEGES;

USE catalogo;
CREATE TABLE IF NOT EXISTS categorias (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) NULL,
    activo BIT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prioridades (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    nivel INT NULL,
    activo BIT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO prioridades (nombre, nivel, activo) VALUES 
('Baja', 1, 1), ('Media', 2, 1), ('Alta', 3, 1), ('Urgente', 4, 1)
ON DUPLICATE KEY UPDATE nombre=nombre;

INSERT INTO categorias (nombre, descripcion, activo) VALUES
('Hardware', 'Fallas de equipos', 1), ('Software', 'Problemas de sistemas', 1),
('Redes', 'Problemas de red y conectividad', 1), ('Accesos y Seguridad', 'Permisos y accesos', 1)
ON DUPLICATE KEY UPDATE nombre=nombre;
EOF

# 3. Clonar repositorio desde la rama ep2-frontend-roles
cd ~
git clone -b ep2-frontend-roles https://github.com/Vesanmartin/mesatech-cloud.git
cd mesatech-cloud

# 4. Crear .env para ms-catalogo
cat << 'EOF' > ms-catalogo/.env
SERVER_PORT=8082
DB_URL=jdbc:mysql://mesatech-catalogo-db.c1okasyq2r7x.us-east-1.rds.amazonaws.com:3306/catalogo
DB_USER=app_catalogo
DB_PASSWORD=CatalogoDbPass2026!
RABBIT_HOST=172.31.17.146
RABBIT_PORT=5672
RABBIT_VHOST=mesatech
RABBIT_USER=catalogo_publicador
RABBIT_PASSWORD=CatalogoPass2026!
EOF

# 5. Obtener la IP pública actual de EC2 A y crear .env del BFF
IP_A=$(curl -s checkip.amazonaws.com)
cat << EOF > bff/.env
SERVER_PORT=8080
MS_CATALOGO_URL=http://localhost:8082
MS_SOLICITUDES_URL=http://172.31.29.191:8081
CORS_ALLOWED_ORIGINS=http://${IP_A},http://${IP_A}:80,http://localhost:3000
EOF

# 6. Compilar y ejecutar ms-catalogo y BFF en segundo plano
cd ~/mesatech-cloud/ms-catalogo
chmod +x mvnw
./mvnw clean package -DskipTests
nohup java -jar target/*.jar --spring.config.import=optional:file:.env[.properties] > catalogo.log 2>&1 &

cd ~/mesatech-cloud/bff
chmod +x mvnw
./mvnw clean package -DskipTests
nohup java -jar target/*.jar --spring.config.import=optional:file:.env[.properties] > bff.log 2>&1 &

# 7. Desplegar Frontend React en AWS en Puerto 80 (HTTP)
cd ~/mesatech-cloud/frontend
cat << EOF > .env
REACT_APP_BFF_URL=http://${IP_A}:8080
EOF

npm install
npm run build
sudo pkill -f serve || true
sudo nohup serve -s build -l 80 > frontend.log 2>&1 &

# 8. Validar procesos y respuesta
sleep 5
ps aux | grep -E 'java|serve'
curl -I http://localhost:80
echo "Frontend accesible en: http://${IP_A}" """
    add_code_block(doc, a_cmd)

    # 5. Configuración Azure y Protocolo de Pruebas
    h5 = doc.add_heading(level=1)
    r_h5 = h5.add_run("5. Configuración de Azure Entra ID y Protocolo de Pruebas (Rúbrica)")
    r_h5.bold = True
    r_h5.font.size = Pt(13)
    r_h5.font.color.rgb = RGBColor(43, 108, 176)

    doc.add_paragraph("Ajuste de Redirect URI en Microsoft Entra ID (Portal Azure):").bold = True
    doc.add_paragraph("Para que el botón de inicio de sesión con Microsoft funcione al acceder a la IP pública de AWS:")
    doc.add_paragraph("1. Ir al Portal de Azure (portal.azure.com) > Microsoft Entra ID > Registros de aplicaciones (App registrations).\n"
                      "2. Seleccionar la aplicación de MesaTech Cloud > Menú Autenticación.\n"
                      "3. En la sección 'Aplicación de página única (SPA)', hacer clic en 'Agregar URI' e incluir:\n"
                      "   http://3.84.111.84\n"
                      "   (o la IP pública actual arrojada por curl -s checkip.amazonaws.com en EC2 A)\n"
                      "4. Guardar los cambios.")

    doc.add_paragraph("Protocolo de Pruebas Obligatorias para la Rúbrica EP2:").bold = True

    tests = [
        ("Prueba 1: Login Institucional y Lectura de Claims", 
         "Abrir http://localhost:3000 y hacer clic en 'Iniciar sesión con Microsoft'. "
         "Evidencia: Se despliega el nombre del usuario, correo institucional y el badge oficial del rol asignado por Entra ID en la cabecera."),
        
        ("Prueba 2: Matriz de Roles (Control de Acceso)",
         "• Administrador: Visualiza todas las solicitudes, selector para cambiar Prioridad de cualquier ticket, pestaña 'Categorías & Prioridades', y monitor de colas RabbitMQ al pie.\n"
         "• Operador: Visualiza solicitudes sin asignar (botón 'Auto-asignarme') y solicitudes asignadas a él. Modal 'Atender' para registrar notas y transicionar estados (En Progreso / Resuelta / Cerrada). Oculta monitor de colas.\n"
         "• Cliente: Visualiza únicamente sus tickets personales en modo consulta y formulario con dropdowns de Categoría y Prioridad."),
        
        ("Prueba 3: Sincronización Asíncrona Event-Driven (RabbitMQ)",
         "Como Administrador, crear una categoría nueva (ej. 'Telefonía IP' o 'Ciberseguridad'). "
         "Flujo: ms-catalogo guarda en RDS Catálogo -> publica 'categoria.creada' en catalogo.exchange -> ms-solicitudes consume de solicitudes.catalogo.queue -> replica en categorias_locales de RDS Solicitudes. "
         "Evidencia: La categoría aparece automáticamente disponible al crear una solicitud sin acoplamiento HTTP entre microservicios."),
        
        ("Prueba 4: Monitor y Métricas en Panel Web RabbitMQ",
         "Abrir http://34.227.193.103:15672 (admin / RabbitMQ2026!). "
         "Evidencia: Mostrar en la pestaña 'Queues' la cola solicitudes.catalogo.queue con los mensajes procesados, y en 'Exchanges' el binding directo 'categoria.creada'.")
    ]

    for t_name, t_desc in tests:
        p_t = doc.add_paragraph(style='List Bullet')
        p_t.paragraph_format.space_before = Pt(2)
        p_t.paragraph_format.space_after = Pt(2)
        r_tn = p_t.add_run(f"{t_name}:\n")
        r_tn.bold = True
        p_t.add_run(t_desc)


    # 6. Procedimiento de Reactivación tras Reinicio de AWS Learner Lab
    h6 = doc.add_heading(level=1)
    r_h6 = h6.add_run("6. Procedimiento de Reactivación tras Reinicio de AWS Learner Lab")
    r_h6.bold = True
    r_h6.font.size = Pt(13)
    r_h6.font.color.rgb = RGBColor(43, 108, 176)

    doc.add_paragraph(
        "Debido a las políticas temporales de AWS Academy Learner Lab (sesiones de 4 horas), las instancias EC2 "
        "pueden apagarse automáticamente. Al encenderlas de nuevo, AWS asigna nuevas IPs públicas efímeras, "
        "pero mantiene intactas las IPs privadas de la VPC (172.31.x.x) y los endpoints DNS de Amazon RDS."
    )

    doc.add_paragraph("Pasos rápidos para reanudar el sistema en minutos:").bold = True

    pasos_reinicio = [
        ("Paso 1: Iniciar RabbitMQ en EC2 C", 
         "Conectar por SSH a EC2 C y verificar contenedor:\n"
         "cd ~/rabbitmq ; docker compose up -d\n"
         "Acceso Web: http://34.227.193.103:15672 (admin / RabbitMQ2026!)"),
        
        ("Paso 2: Iniciar ms-solicitudes en EC2 B",
         "Conectar por SSH a EC2 B y levantar el microservicio:\n"
         "cd /home/ubuntu/mesatech-cloud/ms-solicitudes\n"
         "nohup java -jar target/ms-solicitudes-0.0.1-SNAPSHOT.jar > solicitudes.log 2>&1 &\n"
         "(o: sudo systemctl start ms-solicitudes)"),
        
        ("Paso 3: Iniciar ms-catalogo y BFF en EC2 A",
         "Conectar por SSH a EC2 A y levantar ambos componentes:\n"
         "cd /home/ubuntu/mesatech-cloud/ms-catalogo && nohup java -jar target/ms-catalogo-0.0.1-SNAPSHOT.jar > catalogo.log 2>&1 &\n"
         "cd /home/ubuntu/mesatech-cloud/bff && nohup java -jar target/bff-0.0.1-SNAPSHOT.jar > bff.log 2>&1 &\n"
         "(o: sudo systemctl start ms-catalogo ; sudo systemctl start bff)"),
        
        ("Paso 4: Actualizar IP Pública del BFF en el Frontend",
         "En el entorno local donde corre el frontend de React:\n"
         "1. Editar archivo frontend/.env: REACT_APP_BFF_URL=http://3.84.111.84:8080\n"
         "2. El cliente BFF (bffClient.js) se reconecta inmediatamente al gateway en AWS."),
         
        ("Paso 5: Resiliencia del Frontend (Sin Datos Falsos)",
         "A diferencia de prototipos básicos que simulan datos al azar ante caídas, MesaTech Cloud implementa "
         "resiliencia real de nivel empresarial: si el backend está inaccesible o en proceso de reinicio, "
         "el frontend muestra un banner explícito de pérdida de conectividad ('No se pudo conectar con el BFF en AWS') "
         "y mantiene el estado limpio sin inyectar tickets falsos, preservando la fidelidad de los datos de RDS.")
    ]

    for p_name, p_desc in pasos_reinicio:
        p_item = doc.add_paragraph(style='List Bullet')
        p_item.paragraph_format.space_before = Pt(2)
        p_item.paragraph_format.space_after = Pt(2)
        r_pn = p_item.add_run(f"{p_name}:\n")
        r_pn.bold = True
        p_item.add_run(p_desc)

    doc.save(filename)
    print(f"Documento guardado exitosamente en: {filename}")

if __name__ == "__main__":
    out_file = r"d:\tiare\proyectos\cloud native\prueba 2\mesatech-cloud\Guia_Despliegue_AWS_MesaTech_Cloud_EP2.docx"
    create_guide_docx(out_file)

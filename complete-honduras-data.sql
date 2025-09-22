-- Eliminar localidades y municipios anteriores
DELETE FROM localities;
DELETE FROM municipalities;

-- Insertar TODOS los municipios de Honduras

-- Municipios de ATLÁNTIDA (01)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('01-01', 'LA CEIBA', '01', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('01-02', 'EL PORVENIR', '01', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('01-03', 'ESPARTA', '01', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('01-04', 'JUTIAPA', '01', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('01-05', 'LA MASICA', '01', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('01-06', 'SAN FRANCISCO', '01', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('01-07', 'TELA', '01', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('01-08', 'ARIZONA', '01', '08');

-- Municipios de COLÓN (02)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('02-01', 'TRUJILLO', '02', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('02-02', 'BALFATE', '02', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('02-03', 'IRIONA', '02', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('02-04', 'LIMÓN', '02', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('02-05', 'SABÁ', '02', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('02-06', 'SANTA FE', '02', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('02-07', 'SANTA ROSA DE AGUÁN', '02', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('02-08', 'SONAGUERA', '02', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('02-09', 'TOCOA', '02', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('02-10', 'BONITO ORIENTAL', '02', '10');

-- Municipios de COMAYAGUA (03)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-01', 'COMAYAGUA', '03', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-02', 'AJUTERIQUE', '03', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-03', 'EL ROSARIO', '03', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-04', 'ESQUIAS', '03', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-05', 'HUMUYA', '03', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-06', 'LA LIBERTAD', '03', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-07', 'LAMANI', '03', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-08', 'LA TRINIDAD', '03', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-09', 'LEJAMANÍ', '03', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-10', 'MEAMBAR', '03', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-11', 'MINAS DE ORO', '03', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-12', 'OJOS DE AGUA', '03', '12');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-13', 'SAN JERÓNIMO', '03', '13');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-14', 'SAN JOSÉ DE COMAYAGUA', '03', '14');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-15', 'SAN JOSÉ DEL POTRERO', '03', '15');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-16', 'SAN LUIS', '03', '16');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-17', 'SAN SEBASTIAN', '03', '17');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-18', 'SIGUATEPEQUE', '03', '18');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-19', 'VILLA DE SAN ANTONIO', '03', '19');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-20', 'LAS LAJAS', '03', '20');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('03-21', 'TAULABE', '03', '21');

-- Municipios de COPÁN (04)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-01', 'SANTA ROSA DE COPÁN', '04', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-02', 'CABAÑAS', '04', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-03', 'CONCEPCIÓN', '04', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-04', 'COPÁN RUINAS', '04', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-05', 'CORQUÍN', '04', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-06', 'CUCUYAGUA', '04', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-07', 'DOLORES', '04', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-08', 'DULCE NOMBRE', '04', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-09', 'EL PARAÍSO', '04', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-10', 'FLORIDA', '04', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-11', 'LA JIGUA', '04', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-12', 'LA UNION', '04', '12');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-13', 'NUEVA ARCADIA', '04', '13');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-14', 'SAN AGUSTÍN', '04', '14');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-15', 'SAN ANTONIO', '04', '15');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-16', 'SAN JERONIMO', '04', '16');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-17', 'SAN JOSÉ', '04', '17');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-18', 'SAN JUAN DE OPOA', '04', '18');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-19', 'SAN NICOLAS', '04', '19');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-20', 'SAN PEDRO', '04', '20');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-21', 'SANTA RITA', '04', '21');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-22', 'TRINIDAD DE COPÁN', '04', '22');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('04-23', 'VERACRUZ', '04', '23');

-- Municipios de CORTÉS (05)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-01', 'SAN PEDRO SULA', '05', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-02', 'CHOLOMA', '05', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-03', 'OMOA', '05', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-04', 'PIMIENTA', '05', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-05', 'POTRERILLOS', '05', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-06', 'PUERTO CORTÉS', '05', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-07', 'SAN ANTONIO DE CORTÉS', '05', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-08', 'SAN FRANCISCO DE YOJOA', '05', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-09', 'SAN MANUEL', '05', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-10', 'SANTA CRUZ DE YOJOA', '05', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-11', 'VILLANUEVA', '05', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('05-12', 'LA LIMA', '05', '12');

-- Municipios de CHOLUTECA (06)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-01', 'CHOLUTECA', '06', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-02', 'APACILAGUA', '06', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-03', 'CONCEPCIÓN DE MARÍA', '06', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-04', 'DUYURE', '06', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-05', 'EL CORPUS', '06', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-06', 'EL TRIUNFO', '06', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-07', 'MARCOVIA', '06', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-08', 'MOROLICA', '06', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-09', 'NAMASIGUE', '06', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-10', 'OROCUINA', '06', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-11', 'PESPIRE', '06', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-12', 'SAN ANTONIO DE FLORES', '06', '12');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-13', 'SAN ISIDRO', '06', '13');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-14', 'SAN JOSÉ', '06', '14');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-15', 'SAN MARCOS DE COLON', '06', '15');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('06-16', 'SANTA ANA DE YUSGUARE', '06', '16');

-- Municipios de EL PARAÍSO (07)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-01', 'YUSCARAN', '07', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-02', 'ALAUCA', '07', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-03', 'DANLI', '07', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-04', 'EL PARAÍSO', '07', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-05', 'GUINOPE', '07', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-06', 'JACALEAPA', '07', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-07', 'LIURE', '07', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-08', 'MOROCELI', '07', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-09', 'OROPOLI', '07', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-10', 'POTRERILLOS', '07', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-11', 'SAN ANTONIO DE FLORES', '07', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-12', 'SAN LUCAS', '07', '12');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-13', 'SAN MATIAS', '07', '13');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-14', 'SOLEDAD', '07', '14');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-15', 'TEUPASENTI', '07', '15');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-16', 'TEXIGUAT', '07', '16');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-17', 'VADO ANCHO', '07', '17');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-18', 'YAUYUPE', '07', '18');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('07-19', 'TROJES', '07', '19');

-- Municipios de FRANCISCO MORAZÁN (08)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-01', 'DISTRITO CENTRAL', '08', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-02', 'ALUBAREN', '08', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-03', 'CEDROS', '08', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-04', 'CURAREN', '08', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-05', 'EL PORVENIR', '08', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-06', 'GUAIMACA', '08', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-07', 'LA LIBERTAD', '08', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-08', 'LA VENTA', '08', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-09', 'LEPATERIQUE', '08', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-10', 'MARAITA', '08', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-11', 'MARALE', '08', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-12', 'NUEVA ARMENIA', '08', '12');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-13', 'OJOJONA', '08', '13');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-14', 'ORICA', '08', '14');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-15', 'REITOCA', '08', '15');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-16', 'SABANAGRANDE', '08', '16');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-17', 'SAN ANTONIO DE ORIENTE', '08', '17');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-18', 'SAN BUENAVENTURA', '08', '18');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-19', 'SAN IGNACIO', '08', '19');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-20', 'SAN JUAN DE FLORES', '08', '20');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-21', 'SAN MIGUELITO', '08', '21');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-22', 'SANTA ANA', '08', '22');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-23', 'SANTA LUCIA', '08', '23');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-24', 'TALANGA', '08', '24');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-25', 'TATUMBLA', '08', '25');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-26', 'VALLE DE ÁNGELES', '08', '26');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-27', 'VILLA DE SAN FRANCISCO', '08', '27');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('08-28', 'VALLECILLO', '08', '28');

-- Municipios de GRACIAS A DIOS (09)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('09-01', 'PUERTO LEMPIRA', '09', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('09-02', 'BRUS LAGUNA', '09', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('09-03', 'AHUAS', '09', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('09-04', 'JUAN FRANCISCO  BULNES', '09', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('09-05', 'RAMÓN VILLEDA MORALES', '09', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('09-06', 'WAMPUSIRPI', '09', '06');

-- Municipios de INTIBUCÁ (10)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-01', 'LA ESPERANZA', '10', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-02', 'CAMASCA', '10', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-03', 'COLOMONCAGUA', '10', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-04', 'CONCEPCIÓN', '10', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-05', 'DOLORES', '10', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-06', 'INTIBUCA', '10', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-07', 'JESÚS DE OTORO', '10', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-08', 'MAGDALENA', '10', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-09', 'MASAGUARA', '10', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-10', 'SAN ANTONIO', '10', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-11', 'SAN ISIDRO', '10', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-12', 'SAN JUAN', '10', '12');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-13', 'SAN MARCOS DE SIERRA', '10', '13');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-14', 'SAN MIGUELITO', '10', '14');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-15', 'SANTA LUCIA', '10', '15');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-16', 'YAMARANGUILA', '10', '16');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('10-17', 'SAN FRANCISCO DE OPALACA', '10', '17');

-- Municipios de ISLAS DE LA BAHÍA (11)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('11-01', 'ROATAN', '11', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('11-02', 'GUANAJA', '11', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('11-03', 'JOSÉ SANTOS GUARDIOLA', '11', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('11-04', 'UTILA', '11', '04');

-- Municipios de LA PAZ (12)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-01', 'LA PAZ', '12', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-02', 'AGUANQUETERIQUE', '12', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-03', 'CABANAS', '12', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-04', 'CANE', '12', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-05', 'CHINACLA', '12', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-06', 'GUAJIQUIRO', '12', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-07', 'LAUTERIQUE', '12', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-08', 'MARCALA', '12', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-09', 'MERCEDES DE ORIENTE', '12', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-10', 'OPATORO', '12', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-11', 'SAN ANTONIO DEL NORTE', '12', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-12', 'SAN JOSÉ', '12', '12');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-13', 'SAN JUAN', '12', '13');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-14', 'SAN PEDRO DE TUTULE', '12', '14');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-15', 'SANTA ANA', '12', '15');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-16', 'SANTA ELENA', '12', '16');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-17', 'SANTA MARÍA', '12', '17');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-18', 'SANTIAGO DE PURINGLA', '12', '18');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('12-19', 'YARULA', '12', '19');

-- Municipios de LEMPIRA (13)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-01', 'GRACIAS', '13', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-02', 'BELEN', '13', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-03', 'CANDELARIA', '13', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-04', 'COLOLACA', '13', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-05', 'ERANDIQUE', '13', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-06', 'GUALCINCE', '13', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-07', 'GUARITA', '13', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-08', 'LA CAMPA', '13', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-09', 'LA IGUALA', '13', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-10', 'LAS FLORES', '13', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-11', 'LA UNION', '13', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-12', 'LA VIRTUD', '13', '12');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-13', 'LEPAERA', '13', '13');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-14', 'MAPULACA', '13', '14');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-15', 'PIRAERA', '13', '15');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-16', 'SAN ANDRES', '13', '16');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-17', 'SAN FRANCISCO', '13', '17');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-18', 'SAN JUAN GUARITA', '13', '18');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-19', 'SAN MANUEL COLOHETE', '13', '19');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-20', 'SAN RAFAEL', '13', '20');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-21', 'SAN SEBASTIAN', '13', '21');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-22', 'SANTA CRUZ', '13', '22');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-23', 'TALGUA', '13', '23');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-24', 'TAMBLA', '13', '24');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-25', 'TOMALA', '13', '25');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-26', 'VALLADOLID', '13', '26');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-27', 'VIRGINIA', '13', '27');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('13-28', 'SAN MARCOS DE CAIQUIN', '13', '28');

-- Municipios de OCOTEPEQUE (14)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-01', 'OCOTEPEQUE', '14', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-02', 'BELEN GUALCHO', '14', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-03', 'CONCEPCIÓN', '14', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-04', 'DOLORES MERENDON', '14', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-05', 'FRATERNIDAD', '14', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-06', 'LA ENCARNACION', '14', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-07', 'LA LABOR', '14', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-08', 'LUCERNA', '14', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-09', 'MERCEDES', '14', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-10', 'SAN FERNANDO', '14', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-11', 'SAN FRANCISCO DEL VALLE', '14', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-12', 'SAN JORGE', '14', '12');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-13', 'SAN MARCOS', '14', '13');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-14', 'SANTA FE', '14', '14');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-15', 'SENSENTI', '14', '15');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('14-16', 'SINUAPA', '14', '16');

-- Municipios de OLANCHO (15)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-01', 'JUTICALPA', '15', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-02', 'CAMPAMENTO', '15', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-03', 'CATACAMAS', '15', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-04', 'CONCORDIA', '15', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-05', 'DULCE NOMBRE DE CULMI', '15', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-06', 'EL ROSARIO', '15', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-07', 'ESQUIPULAS DEL NORTE', '15', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-08', 'GUALACO', '15', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-09', 'GUARIZAMA', '15', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-10', 'GUATA', '15', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-11', 'GUAYAPE', '15', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-12', 'JANO', '15', '12');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-13', 'LA UNION', '15', '13');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-14', 'MANGULILE', '15', '14');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-15', 'MANTO', '15', '15');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-16', 'SALAMA', '15', '16');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-17', 'SAN ESTEBAN', '15', '17');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-18', 'SAN FRANCISCO DE BECERRA', '15', '18');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-19', 'SAN FRANCISCO DE LA PAZ', '15', '19');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-20', 'SANTA MARÍA DEL REAL', '15', '20');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-21', 'SILCA', '15', '21');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-22', 'YOCON', '15', '22');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('15-23', 'PATUCA', '15', '23');

-- Municipios de SANTA BÁRBARA (16)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-01', 'SANTA BARBARA', '16', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-02', 'ARADA', '16', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-03', 'ATIMA', '16', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-04', 'AZACUALPA', '16', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-05', 'CEGUACA', '16', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-06', 'SAN JOSÉ DE COLINAS', '16', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-07', 'CONCEPCIÓN DEL NORTE', '16', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-08', 'CONCEPCIÓN DEL SUR', '16', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-09', 'CHINDA', '16', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-10', 'EL NISPERO', '16', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-11', 'GUALALA', '16', '11');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-12', 'ILAMA', '16', '12');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-13', 'MACUELIZO', '16', '13');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-14', 'NARANJITO', '16', '14');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-15', 'NUEVA CELILAC', '16', '15');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-16', 'PETOA', '16', '16');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-17', 'PROTECCIÓN', '16', '17');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-18', 'QUIMISTAN', '16', '18');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-19', 'SAN FRANCISCO DE OJUERA', '16', '19');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-20', 'SAN LUIS', '16', '20');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-21', 'SAN MARCOS', '16', '21');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-22', 'SAN NICOLAS', '16', '22');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-23', 'SAN PEDRO ZACAPA', '16', '23');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-24', 'SANTA RITA', '16', '24');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-25', 'SAN VICENTE CENTENARIO', '16', '25');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-26', 'TRINIDAD', '16', '26');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-27', 'LAS VEGAS', '16', '27');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('16-28', 'NUEVA FRONTERA', '16', '28');

-- Municipios de VALLE (17)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('17-01', 'NACAOME', '17', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('17-02', 'ALIANZA', '17', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('17-03', 'AMAPALA', '17', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('17-04', 'ARAMECINA', '17', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('17-05', 'CARIDAD', '17', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('17-06', 'GOASCORAN', '17', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('17-07', 'LANGUE', '17', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('17-08', 'SAN FRANCISCO DE CORAY', '17', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('17-09', 'SAN LORENZO', '17', '09');

-- Municipios de YORO (18)
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('18-01', 'YORO', '18', '01');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('18-02', 'ARENAL', '18', '02');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('18-03', 'EL NEGRITO', '18', '03');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('18-04', 'EL PROGRESO', '18', '04');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('18-05', 'JOCON', '18', '05');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('18-06', 'MORAZAN', '18', '06');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('18-07', 'OLANCHITO', '18', '07');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('18-08', 'SANTA RITA', '18', '08');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('18-09', 'SULACO', '18', '09');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('18-10', 'VICTORIA', '18', '10');
INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('18-11', 'YORITO', '18', '11');

-- Insertar localidades de ejemplo para municipios principales
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-001', 'Centro Histórico', '08-01', 'urbano', '001');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-002', 'Comayagüela', '08-01', 'urbano', '002');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-003', 'Kennedy', '08-01', 'urbano', '003');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-004', 'Aldea El Hatillo', '08-01', 'rural', '004');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-005', 'Centro', '05-01', 'urbano', '001');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-006', 'Chamelecón', '05-01', 'urbano', '002');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-007', 'Río de Piedras', '05-01', 'urbano', '003');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-008', 'Aldea San José', '05-01', 'rural', '004');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-009', 'Centro', '01-01', 'urbano', '001');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-010', 'La Isla', '01-01', 'urbano', '002');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-011', 'Aldea La Bomba', '01-01', 'rural', '003');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-012', 'Centro', '06-01', 'urbano', '001');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-013', 'Aldea Montaña Verde', '06-01', 'rural', '002');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-014', 'Coxen Hole', '11-01', 'urbano', '001');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-015', 'West End', '11-01', 'urbano', '002');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-016', 'Centro', '02-01', 'urbano', '001');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-017', 'Centro', '03-01', 'urbano', '001');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-018', 'Centro', '04-01', 'urbano', '001');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-019', 'Centro', '07-01', 'urbano', '001');
INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('LOC-020', 'Centro', '15-01', 'urbano', '001');

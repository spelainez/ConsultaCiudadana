import fs from 'fs';

// Read the municipal data
const municipalData = JSON.parse(fs.readFileSync('municipal-data.json', 'utf8'));

console.log('🏘️ Procesando datos municipales de Honduras...\n');

// Group by department correctly
const byDepartment = {};
municipalData.forEach(row => {
  const deptCode = String(row['Código Departamento']).padStart(2, '0');
  if (!byDepartment[deptCode]) {
    byDepartment[deptCode] = [];
  }
  byDepartment[deptCode].push(row);
});

console.log('📊 Municipios por departamento:');
Object.keys(byDepartment).sort().forEach(deptCode => {
  const munis = byDepartment[deptCode];
  console.log(`${deptCode} - ${munis[0].Departamento}: ${munis.length} municipios`);
});

// Generate SQL to insert all municipalities with proper relationships
let sqlStatements = '';

sqlStatements += '-- Eliminar localidades y municipios anteriores\n';
sqlStatements += 'DELETE FROM localities;\n';
sqlStatements += 'DELETE FROM municipalities;\n\n';

sqlStatements += '-- Insertar TODOS los municipios de Honduras\n';

Object.keys(byDepartment).sort().forEach(deptCode => {
  const municipalities = byDepartment[deptCode];
  const deptName = municipalities[0].Departamento;
  
  sqlStatements += `\n-- Municipios de ${deptName} (${deptCode})\n`;
  
  municipalities.forEach(muni => {
    const municipalCode = String(muni['Código Municipio']).slice(-2); // Last 2 digits for geocode
    const id = `${deptCode}-${municipalCode}`;
    const name = muni.Municipio.replace(/'/g, "''"); // Escape quotes
    
    sqlStatements += `INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('${id}', '${name}', '${deptCode}', '${municipalCode}');\n`;
  });
});

// Add sample localities for major municipalities
sqlStatements += '\n-- Insertar localidades de ejemplo para municipios principales\n';

const sampleLocalities = [
  // Tegucigalpa (Francisco Morazán) 
  { id: 'LOC-001', name: 'Centro Histórico', municipalityId: '08-01', area: 'urbano', geocode: '001' },
  { id: 'LOC-002', name: 'Comayagüela', municipalityId: '08-01', area: 'urbano', geocode: '002' },
  { id: 'LOC-003', name: 'Kennedy', municipalityId: '08-01', area: 'urbano', geocode: '003' },
  { id: 'LOC-004', name: 'Aldea El Hatillo', municipalityId: '08-01', area: 'rural', geocode: '004' },
  
  // San Pedro Sula (Cortés)
  { id: 'LOC-005', name: 'Centro', municipalityId: '05-01', area: 'urbano', geocode: '001' },
  { id: 'LOC-006', name: 'Chamelecón', municipalityId: '05-01', area: 'urbano', geocode: '002' },
  { id: 'LOC-007', name: 'Río de Piedras', municipalityId: '05-01', area: 'urbano', geocode: '003' },
  { id: 'LOC-008', name: 'Aldea San José', municipalityId: '05-01', area: 'rural', geocode: '004' },
  
  // La Ceiba (Atlántida)
  { id: 'LOC-009', name: 'Centro', municipalityId: '01-01', area: 'urbano', geocode: '001' },
  { id: 'LOC-010', name: 'La Isla', municipalityId: '01-01', area: 'urbano', geocode: '002' },
  { id: 'LOC-011', name: 'Aldea La Bomba', municipalityId: '01-01', area: 'rural', geocode: '003' },
  
  // Choluteca (Choluteca)
  { id: 'LOC-012', name: 'Centro', municipalityId: '06-01', area: 'urbano', geocode: '001' },
  { id: 'LOC-013', name: 'Aldea Montaña Verde', municipalityId: '06-01', area: 'rural', geocode: '002' },
  
  // Roatán (Islas de la Bahía)
  { id: 'LOC-014', name: 'Coxen Hole', municipalityId: '11-01', area: 'urbano', geocode: '001' },
  { id: 'LOC-015', name: 'West End', municipalityId: '11-01', area: 'urbano', geocode: '002' },
  
  // Add some for other major cities
  { id: 'LOC-016', name: 'Centro', municipalityId: '02-01', area: 'urbano', geocode: '001' }, // Trujillo
  { id: 'LOC-017', name: 'Centro', municipalityId: '03-01', area: 'urbano', geocode: '001' }, // Comayagua
  { id: 'LOC-018', name: 'Centro', municipalityId: '04-01', area: 'urbano', geocode: '001' }, // Santa Rosa de Copán
  { id: 'LOC-019', name: 'Centro', municipalityId: '07-01', area: 'urbano', geocode: '001' }, // Yuscarán
  { id: 'LOC-020', name: 'Centro', municipalityId: '15-01', area: 'urbano', geocode: '001' }, // Juticalpa
];

sampleLocalities.forEach(locality => {
  sqlStatements += `INSERT INTO localities (id, name, municipality_id, area, geocode) VALUES ('${locality.id}', '${locality.name.replace(/'/g, "''")}', '${locality.municipalityId}', '${locality.area}', '${locality.geocode}');\n`;
});

// Save SQL to file
fs.writeFileSync('complete-honduras-data.sql', sqlStatements);

console.log(`\n✅ Archivo SQL generado: complete-honduras-data.sql`);
console.log(`📊 Total de municipios: ${municipalData.length}`);
console.log(`🏡 Localidades de ejemplo: ${sampleLocalities.length}`);
console.log('\n🔧 Listo para actualizar la base de datos con datos completos de Honduras');

// Output some sample SQL for verification
console.log('\n--- SAMPLE SQL (primeros municipios) ---');
const firstDeptCode = Object.keys(byDepartment).sort()[0];
const firstMunis = byDepartment[firstDeptCode].slice(0, 3);
firstMunis.forEach(muni => {
  const municipalCode = String(muni['Código Municipio']).slice(-2);
  const id = `${firstDeptCode}-${municipalCode}`;
  console.log(`INSERT INTO municipalities (id, name, department_id, geocode) VALUES ('${id}', '${muni.Municipio}', '${firstDeptCode}', '${municipalCode}');`);
});
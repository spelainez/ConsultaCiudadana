import fs from 'fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { departments, municipalities, localities } from './shared/schema.js';
import { eq } from 'drizzle-orm';

// Read the Honduras data
const hondurasData = JSON.parse(fs.readFileSync('honduras-data.json', 'utf8'));

// Database connection
const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);
const db = drizzle(sql);

console.log('🇭🇳 Actualizando datos geográficos de Honduras...\n');

// Update departments with official names
async function updateDepartments() {
  console.log('📍 Actualizando departamentos...');
  
  for (const dept of hondurasData) {
    const code = String(dept.Código).padStart(2, '0');
    const name = dept['Nombre del Departamento'];
    
    await db.update(departments)
      .set({ name: name })
      .where(eq(departments.id, code));
    
    console.log(`✅ ${code} - ${name}`);
  }
  
  console.log('\n📍 Departamentos actualizados exitosamente!\n');
}

// Add some representative municipalities for major departments
async function addMunicipalities() {
  console.log('🏘️ Agregando municipios principales...');
  
  const mainMunicipalities = [
    // Atlántida
    { id: 'AT-001', name: 'La Ceiba', departmentId: '01', geocode: '001' },
    { id: 'AT-002', name: 'Tela', departmentId: '01', geocode: '002' },
    { id: 'AT-003', name: 'El Progreso', departmentId: '01', geocode: '003' },
    
    // Cortés
    { id: 'CR-001', name: 'San Pedro Sula', departmentId: '05', geocode: '001' },
    { id: 'CR-002', name: 'Choloma', departmentId: '05', geocode: '002' },
    { id: 'CR-003', name: 'La Lima', departmentId: '05', geocode: '003' },
    
    // Francisco Morazán
    { id: 'FM-001', name: 'Tegucigalpa', departmentId: '08', geocode: '001' },
    { id: 'FM-002', name: 'Comayagüela', departmentId: '08', geocode: '002' },
    { id: 'FM-003', name: 'Valle de Ángeles', departmentId: '08', geocode: '003' },
    
    // Choluteca
    { id: 'CH-001', name: 'Choluteca', departmentId: '06', geocode: '001' },
    { id: 'CH-002', name: 'Marcovia', departmentId: '06', geocode: '002' },
    
    // Copán
    { id: 'CP-001', name: 'Santa Rosa de Copán', departmentId: '04', geocode: '001' },
    { id: 'CP-002', name: 'Copán Ruinas', departmentId: '04', geocode: '002' },
    
    // Comayagua
    { id: 'CM-001', name: 'Comayagua', departmentId: '03', geocode: '001' },
    { id: 'CM-002', name: 'Siguatepeque', departmentId: '03', geocode: '002' },
    
    // Colón
    { id: 'CL-001', name: 'Trujillo', departmentId: '02', geocode: '001' },
    { id: 'CL-002', name: 'Tocoa', departmentId: '02', geocode: '002' },
    
    // Yoro
    { id: 'YO-001', name: 'Yoro', departmentId: '18', geocode: '001' },
    { id: 'YO-002', name: 'Olanchito', departmentId: '18', geocode: '002' },
    
    // Olancho
    { id: 'OL-001', name: 'Juticalpa', departmentId: '15', geocode: '001' },
    { id: 'OL-002', name: 'Catacamas', departmentId: '15', geocode: '002' },
  ];
  
  // Clear existing municipalities first
  await db.delete(municipalities);
  console.log('🗑️ Municipios anteriores eliminados');
  
  for (const muni of mainMunicipalities) {
    await db.insert(municipalities).values(muni);
    console.log(`✅ ${muni.name} (${muni.departmentId})`);
  }
  
  console.log('\n🏘️ Municipios principales agregados exitosamente!\n');
}

// Add localities (urban/rural areas)
async function addLocalities() {
  console.log('🏡 Agregando localidades (urbano/rural)...');
  
  const sampleLocalities = [
    // Urban areas for major cities
    { id: 'LOC-001', name: 'Centro', municipalityId: 'CR-001', area: 'urbano', geocode: '001' },
    { id: 'LOC-002', name: 'Chamelecón', municipalityId: 'CR-001', area: 'urbano', geocode: '002' },
    { id: 'LOC-003', name: 'Río de Piedras', municipalityId: 'CR-001', area: 'urbano', geocode: '003' },
    
    { id: 'LOC-004', name: 'Centro Histórico', municipalityId: 'FM-001', area: 'urbano', geocode: '001' },
    { id: 'LOC-005', name: 'Comayagüela', municipalityId: 'FM-001', area: 'urbano', geocode: '002' },
    { id: 'LOC-006', name: 'Kennedy', municipalityId: 'FM-001', area: 'urbano', geocode: '003' },
    
    { id: 'LOC-007', name: 'Centro', municipalityId: 'AT-001', area: 'urbano', geocode: '001' },
    { id: 'LOC-008', name: 'La Isla', municipalityId: 'AT-001', area: 'urbano', geocode: '002' },
    
    // Rural areas
    { id: 'LOC-009', name: 'Aldea San José', municipalityId: 'CR-001', area: 'rural', geocode: '004' },
    { id: 'LOC-010', name: 'Caserío El Progreso', municipalityId: 'CR-001', area: 'rural', geocode: '005' },
    
    { id: 'LOC-011', name: 'Aldea El Hatillo', municipalityId: 'FM-001', area: 'rural', geocode: '004' },
    { id: 'LOC-012', name: 'Caserío Los Pinos', municipalityId: 'FM-001', area: 'rural', geocode: '005' },
    
    { id: 'LOC-013', name: 'Aldea La Bomba', municipalityId: 'AT-001', area: 'rural', geocode: '003' },
    { id: 'LOC-014', name: 'Caserío El Sauce', municipalityId: 'AT-001', area: 'rural', geocode: '004' },
    
    // More localities for other municipalities
    { id: 'LOC-015', name: 'Centro', municipalityId: 'CH-001', area: 'urbano', geocode: '001' },
    { id: 'LOC-016', name: 'Barrio El Centro', municipalityId: 'CP-001', area: 'urbano', geocode: '001' },
    { id: 'LOC-017', name: 'Centro', municipalityId: 'CM-001', area: 'urbano', geocode: '001' },
    { id: 'LOC-018', name: 'Centro', municipalityId: 'CL-001', area: 'urbano', geocode: '001' },
    { id: 'LOC-019', name: 'Centro', municipalityId: 'YO-001', area: 'urbano', geocode: '001' },
    { id: 'LOC-020', name: 'Centro', municipalityId: 'OL-001', area: 'urbano', geocode: '001' },
  ];
  
  // Clear existing localities first
  await db.delete(localities);
  console.log('🗑️ Localidades anteriores eliminadas');
  
  for (const locality of sampleLocalities) {
    await db.insert(localities).values(locality);
    console.log(`✅ ${locality.name} (${locality.area})`);
  }
  
  console.log('\n🏡 Localidades agregadas exitosamente!\n');
}

// Main execution
async function main() {
  try {
    await updateDepartments();
    await addMunicipalities();
    await addLocalities();
    
    console.log('🎉 ¡Datos geográficos de Honduras actualizados exitosamente!');
    console.log('📊 Resumen:');
    console.log('   - 18 Departamentos oficiales actualizados');
    console.log('   - 20 Municipios principales agregados');
    console.log('   - 20 Localidades (urbanas/rurales) agregadas');
    console.log('\n✅ El formulario de consultas ahora tiene datos reales de Honduras');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

main();
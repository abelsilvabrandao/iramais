
import { Employee, SystemTool, OrganizationUnit, OrganizationDepartment } from '../types';
import { MOCK_EMPLOYEES, MOCK_SYSTEMS } from '../constants';

const EMPLOYEES_KEY = 'INTERMARITIMA_EMPLOYEES';
const SYSTEMS_KEY = 'INTERMARITIMA_SYSTEMS';
const UNITS_KEY = 'INTERMARITIMA_UNITS';
const DEPTS_KEY = 'INTERMARITIMA_DEPTS';

// Helper to simulate database initialization
const initializeData = () => {
  if (!localStorage.getItem(EMPLOYEES_KEY)) {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(MOCK_EMPLOYEES));
  }
  if (!localStorage.getItem(SYSTEMS_KEY)) {
    localStorage.setItem(SYSTEMS_KEY, JSON.stringify(MOCK_SYSTEMS));
  }
  // Initialize Mock Units if empty
  if (!localStorage.getItem(UNITS_KEY)) {
    const mockUnits: OrganizationUnit[] = [
      { id: 'u1', name: 'Matriz - Salvador', address: 'Av. da França, 123' },
      { id: 'u2', name: 'Filial - Porto de Aratu', address: 'Via Matoim, s/n' },
      { id: 'u3', name: 'Filial - São Paulo', address: 'Av. Paulista, 1000' }
    ];
    localStorage.setItem(UNITS_KEY, JSON.stringify(mockUnits));
  }
  // Initialize Mock Departments if empty
  if (!localStorage.getItem(DEPTS_KEY)) {
    const mockDepts: OrganizationDepartment[] = [
      { id: 'd1', name: 'Administrativo' },
      { id: 'd2', name: 'Comercial' },
      { id: 'd3', name: 'Financeiro' },
      { id: 'd4', name: 'Marketing' },
      { id: 'd5', name: 'Operações' },
      { id: 'd6', name: 'Recursos Humanos (RH)' },
      { id: 'd7', name: 'Segurança do Trabalho' },
      { id: 'd8', name: 'Tecnologia da Informação (TI)' }
    ];
    localStorage.setItem(DEPTS_KEY, JSON.stringify(mockDepts));
  }
};

// --- Employee Services ---

export const getEmployees = (): Employee[] => {
  initializeData();
  const data = localStorage.getItem(EMPLOYEES_KEY);
  return data ? JSON.parse(data) : MOCK_EMPLOYEES;
};

export const saveEmployee = (employee: Employee): void => {
  const employees = getEmployees();
  const existingIndex = employees.findIndex(e => e.id === employee.id);
  
  if (existingIndex >= 0) {
    employees[existingIndex] = employee;
  } else {
    employees.push(employee);
  }
  
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
};

export const deleteEmployee = (id: string): void => {
  const employees = getEmployees().filter(e => e.id !== id);
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
};

// Returns just strings for compatibility, now pulling from the managed list + existing employees
export const getDepartments = (): string[] => {
  const managedDepts = getOrganizationDepartments().map(d => d.name);
  const employees = getEmployees();
  const employeeDepts = new Set(employees.map(e => e.department));
  
  // Merge and sort
  const allDepts = new Set([...managedDepts, ...Array.from(employeeDepts)]);
  return Array.from(allDepts).sort();
};

// --- Organization Services (New) ---

export const getOrganizationUnits = (): OrganizationUnit[] => {
  initializeData();
  const data = localStorage.getItem(UNITS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveOrganizationUnit = (unit: OrganizationUnit): void => {
  const units = getOrganizationUnits();
  const index = units.findIndex(u => u.id === unit.id);
  if (index >= 0) units[index] = unit;
  else units.push(unit);
  localStorage.setItem(UNITS_KEY, JSON.stringify(units));
};

export const deleteOrganizationUnit = (id: string): void => {
  const units = getOrganizationUnits().filter(u => u.id !== id);
  localStorage.setItem(UNITS_KEY, JSON.stringify(units));
};

export const getOrganizationDepartments = (): OrganizationDepartment[] => {
  initializeData();
  const data = localStorage.getItem(DEPTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveOrganizationDepartment = (dept: OrganizationDepartment): void => {
  const depts = getOrganizationDepartments();
  const index = depts.findIndex(d => d.id === dept.id);
  if (index >= 0) depts[index] = dept;
  else depts.push(dept);
  localStorage.setItem(DEPTS_KEY, JSON.stringify(depts));
};

export const deleteOrganizationDepartment = (id: string): void => {
  const depts = getOrganizationDepartments().filter(d => d.id !== id);
  localStorage.setItem(DEPTS_KEY, JSON.stringify(depts));
};


// --- System Services ---

export const getSystems = (): SystemTool[] => {
  initializeData();
  const data = localStorage.getItem(SYSTEMS_KEY);
  return data ? JSON.parse(data) : MOCK_SYSTEMS;
};

export const saveSystem = (system: SystemTool): void => {
  const systems = getSystems();
  const existingIndex = systems.findIndex(s => s.id === system.id);
  
  if (existingIndex >= 0) {
    systems[existingIndex] = system;
  } else {
    systems.push(system);
  }
  
  localStorage.setItem(SYSTEMS_KEY, JSON.stringify(systems));
};

export const deleteSystem = (id: string): void => {
  const systems = getSystems().filter(s => s.id !== id);
  localStorage.setItem(SYSTEMS_KEY, JSON.stringify(systems));
};

// --- Access Control ---

export const getSystemsForUser = (userDepartment: string): SystemTool[] => {
  const allSystems = getSystems();
  return allSystems.filter(sys => 
    sys.allowedDepartments.includes('Todos') || 
    sys.allowedDepartments.includes(userDepartment)
  );
};

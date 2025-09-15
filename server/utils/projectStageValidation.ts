// Project stage validation utilities for material requests

export const MATERIAL_REQUEST_ALLOWED_STAGES = [
  'prospect',
  'recce-done',
  'design-in-progress',
  'design-approved',
  'estimate-given',
  'client-approved',
  'production', 
  'installation',
  'handover',
  // Also allow these stages for testing and development
  'Prospect',
  'Recce Done',
  'Design In Progress',
  'Design Approved', 
  'Estimate Given',
  'Client Approved',
  'Production',
  'Installation',
  'Handover'
];

export const PROJECT_STAGE_NAMES = {
  'prospect': 'Prospect',
  'recce-done': 'Recce Done',
  'design-in-progress': 'Design In Progress', 
  'design-approved': 'Design Approved',
  'estimate-given': 'Estimate Given',
  'client-approved': 'Client Approved',
  'production': 'Production',
  'installation': 'Installation',
  'handover': 'Handover',
  'completed': 'Completed',
  'on-hold': 'On Hold',
  'lost': 'Lost'
};

export function canOrderMaterials(projectStage: string): boolean {
  return MATERIAL_REQUEST_ALLOWED_STAGES.includes(projectStage);
}

export function getStageDisplayName(stage: string): string {
  return PROJECT_STAGE_NAMES[stage as keyof typeof PROJECT_STAGE_NAMES] || stage;
}

export function getMaterialRequestEligibleProjects(projects: any[]): any[] {
  console.log("getMaterialRequestEligibleProjects called with projects:", projects.length);
  
  const filtered = projects.filter(project => {
    const stageAllowed = canOrderMaterials(project.stage);
    const isActiveProject = project.isActive || project.is_active; // Handle both naming conventions
    
    console.log(`Project ${project.id} (${project.name}): stage="${project.stage}", stageAllowed=${stageAllowed}, isActive=${isActiveProject}`);
    
    return stageAllowed && isActiveProject;
  });
  
  console.log("Filtered eligible projects:", filtered.length);
  return filtered;
}
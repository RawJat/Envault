"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ComponentStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';
export type IncidentSeverity = 'minor' | 'major' | 'critical' | 'maintenance';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface Component {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  group_name: string | null;
  status: ComponentStatus;
  updated_at: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  incident_updates: IncidentUpdate[];
  components: Component[];
}

export interface IncidentUpdate {
  id: string;
  incident_id: string;
  message: string;
  status: IncidentStatus;
  created_at: string;
}

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  // Only check app_metadata to match RLS policies (user_metadata is insecure)
  const isAdmin = user.app_metadata?.is_admin === true;
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }
  return supabase;
}

export async function getComponents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("status_components")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data as Component[];
}

export async function updateComponentStatus(id: string, status: ComponentStatus) {
  const supabase = await checkAdmin();

  const { error } = await supabase
    .from("status_components")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/status");
  revalidatePath("/admin/status");
  return { success: true };
}

export async function getIncidents(limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("status_incidents")
    .select(`
      *,
      incident_updates:status_incident_updates(*),
      components:status_components!status_component_incidents(*)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  // Sort incident_updates by created_at DESC on the client side
  const sortedData = data?.map(incident => ({
    ...incident,
    incident_updates: incident.incident_updates?.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) || []
  }));

  return sortedData;
}

export async function createIncident(
  title: string,
  severity: IncidentSeverity,
  status: IncidentStatus,
  componentIds: string[],
  initialMessage: string
) {
  const supabase = await checkAdmin();

  // 1. Create Incident
  const { data: incident, error: incidentError } = await supabase
    .from("status_incidents")
    .insert({ title, severity, status })
    .select()
    .single();

  if (incidentError) throw new Error(incidentError.message);

  const incidentId = incident.id;

  // 2. Link Components
  if (componentIds.length > 0) {
    const links = componentIds.map(id => ({
      incident_id: incidentId,
      component_id: id
    }));

    const { error: linkError } = await supabase
      .from("status_component_incidents")
      .insert(links);

    if (linkError) throw new Error(linkError.message);
  }

  // 3. Create Initial Update
  const { error: updateError } = await supabase
    .from("status_incident_updates")
    .insert({
      incident_id: incidentId,
      message: initialMessage,
      status: status
    });

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/status");
  revalidatePath("/admin/status");
  return { success: true, incidentId };
}

export async function updateIncident(incidentId: string, status: IncidentStatus, message: string) {
  const supabase = await checkAdmin();

  // 1. Update Incident Status
  const { error: incidentError } = await supabase
    .from("status_incidents")
    .update({ status })
    .eq("id", incidentId);

  if (incidentError) throw new Error(incidentError.message);

  // 2. Add Update Record
  const { error: updateError } = await supabase
    .from("status_incident_updates")
    .insert({
      incident_id: incidentId,
      message: message,
      status: status
    });

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/status");
  revalidatePath("/admin/status");
  return { success: true };
}

export async function createComponent(name: string, description: string) {
  const supabase = await checkAdmin();

  const { data, error } = await supabase
    .from("status_components")
    .insert({
      name,
      description,
      status: 'operational',
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/status");
  revalidatePath("/admin/status");
  return { success: true, component: data };
}

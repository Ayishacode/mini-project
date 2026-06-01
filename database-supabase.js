const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class SupabaseDatabase {
    constructor() {
        console.log('Connected to Supabase');
    }

    async addGrievance(data) {
        try {
            const grievanceData = {
                category: this.mapDepartmentToCategory(data.department),
                description: data.grievance,
                is_anonymous: data.isAnonymous,
                user_id: data.userId,
                user_department: data.department, // store full "Category - Subcategory" here
                status: 'Submitted',
                image_url: null,
                video_url: null
            };

            // Parse media URLs if present
            if (data.mediaUrls) {
                const mediaArray = JSON.parse(data.mediaUrls);
                if (mediaArray.length > 0) {
                    // Store first image/video URL
                    const firstMedia = mediaArray[0];
                    if (firstMedia.type.startsWith('image/')) {
                        grievanceData.image_url = firstMedia.url;
                    } else if (firstMedia.type.startsWith('video/')) {
                        grievanceData.video_url = firstMedia.url;
                    }
                }
            }

            const { data: result, error } = await supabase
                .from('grievances')
                .insert([grievanceData])
                .select()
                .single();

            if (error) {
                console.error('Supabase insert error:', error);
                throw error;
            }

            // Return the grievance_id (GRV-000001 format)
            return result.grievance_id;
        } catch (error) {
            console.error('Error adding grievance:', error);
            throw error;
        }
    }

    async getAllGrievances() {
        try {
            const { data, error } = await supabase
                .from('grievances')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting grievances:', error);
            return [];
        }
    }

    async getGrievanceById(id) {
        try {
            const { data, error } = await supabase
                .from('grievances')
                .select('*')
                .eq('grievance_id', id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                console.error('Error getting grievance:', error);
            }
            return data || null;
        } catch (error) {
            console.error('Error getting grievance:', error);
            return null;
        }
    }

    async updateGrievance(id, response) {
        try {
            const { error } = await supabase
                .from('grievances')
                .update({
                    status: 'Resolved',
                    updated_at: new Date().toISOString()
                })
                .eq('grievance_id', id);

            if (error) throw error;

            // Add action to history
            await this.addGrievanceAction(id, 'System', response, 'Resolved');
        } catch (error) {
            console.error('Error updating grievance:', error);
            throw error;
        }
    }

    async updateGrievanceStatus(id, status) {
        try {
            const { error } = await supabase
                .from('grievances')
                .update({
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('grievance_id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating status:', error);
            throw error;
        }
    }

    async addGrievanceAction(grievanceId, adminName, remarks, newStatus) {
        try {
            // Get the UUID of the grievance
            const { data: grievance } = await supabase
                .from('grievances')
                .select('id')
                .eq('grievance_id', grievanceId)
                .single();

            if (!grievance) return;

            const { error } = await supabase
                .from('grievance_actions')
                .insert([{
                    grievance_id: grievance.id,
                    admin_name: adminName,
                    remarks: remarks,
                    new_status: newStatus
                }]);

            if (error) throw error;
        } catch (error) {
            console.error('Error adding action:', error);
        }
    }

    async getRecentGrievances(hours = 72) {
        try {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - hours);

            const { data, error } = await supabase
                .from('grievances')
                .select('grievance_id, description, category, status, created_at')
                .gte('created_at', cutoffTime.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Map to format expected by ML service
            return (data || []).map(g => ({
                id: g.grievance_id,
                description: g.description,
                category: g.category,
                status: g.status,
                created_at: g.created_at
            }));
        } catch (error) {
            console.error('Error getting recent grievances:', error);
            return [];
        }
    }

    async markResponseSent(id) {
        // Not needed in Supabase - we track this differently
        return Promise.resolve();
    }

    // Map new subcategories to old allowed constraint values
    mapDepartmentToCategory(department) {
        if (!department) return 'Other';
        const d = department.toLowerCase();
        if (d.includes('teaching') || d.includes('examination') || d.includes('internal assessment')) return 'Academic';
        if (d.includes('fee') || d.includes('scholarship') || d.includes('certificate')) return 'Financial';
        if (d.includes('bullying') || d.includes('threat') || d.includes('defamation') || d.includes('substance') || d.includes('harassment')) return 'Discipline / Harassment';
        if (d.includes('library') || d.includes('canteen') || d.includes('laboratory') || d.includes('computer lab') || d.includes('counselling') || d.includes('hostel') || d.includes('washroom') || d.includes('sports')) return 'Infrastructure';
        if (d.includes('cleanliness') || d.includes('building') || d.includes('electrical') || d.includes('plumbing')) return 'Infrastructure';
        if (d.includes('office') || d.includes('administration')) return 'Administration';
        return 'Other';
    }
}

module.exports = SupabaseDatabase;

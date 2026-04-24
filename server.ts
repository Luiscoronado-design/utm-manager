import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('SUPABASE_URL in server.ts:', supabaseUrl);

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

// Initialize with dummy values if missing to prevent crash, but warn
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseServiceKey || 'placeholder-key'
);

async function startServer() {
  console.log('Starting server...');
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.use(express.json());

  // --- PROFILES ---
  app.get('/api/profiles', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, createdat') // Do not return passwords
        .order('createdat', { ascending: true });
      
      if (error) {
        // If the table doesn't exist yet, return an empty array instead of throwing a 500
        if (error.code === '42P01') {
          console.warn('Profiles table does not exist yet. Returning empty array.');
          return res.json([]);
        }
        console.error('Supabase error in GET /api/profiles:', error);
        throw error;
      }
      res.json(data || []);
    } catch (e: any) { 
      console.error('Error in GET /api/profiles:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error', details: e }); 
    }
  });

  app.post('/api/profiles', async (req, res) => {
    const { id, name, password, createdAt } = req.body;
    try {
      const { error } = await supabase
        .from('profiles')
        .insert([{ id, name, password, createdat: createdAt }]);
      
      if (error) {
        if (error.code === '42P01') {
          return res.status(500).json({ error: 'La tabla profiles no existe en Supabase. Por favor, créala primero.' });
        }
        console.error('Supabase error in POST /api/profiles:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in POST /api/profiles:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.put('/api/profiles/:id', async (req, res) => {
    const updates = req.body;
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', req.params.id);
      
      if (error) {
        if (error.code === '42P01') {
          return res.status(500).json({ error: 'La tabla profiles no existe en Supabase.' });
        }
        console.error('Supabase error in PUT /api/profiles/:id:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in PUT /api/profiles/:id:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.delete('/api/profiles/:id', async (req, res) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', req.params.id);
      
      if (error) {
        if (error.code === '42P01') {
          return res.status(500).json({ error: 'La tabla profiles no existe en Supabase.' });
        }
        console.error('Supabase error in DELETE /api/profiles/:id:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in DELETE /api/profiles/:id:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.post('/api/profiles/verify', async (req, res) => {
    const { id, password } = req.body;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('password')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === '42P01') {
          return res.status(500).json({ error: 'La tabla profiles no existe en Supabase.' });
        }
        console.error('Supabase error in POST /api/profiles/verify:', error);
        throw error;
      }
      
      if (data && data.password === password) {
        res.json({ success: true });
      } else {
        res.status(401).json({ error: 'Invalid password' });
      }
    } catch (e: any) { 
      console.error('Error in POST /api/profiles/verify:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error', details: e }); 
    }
  });

  // --- SPACES ---
  app.get('/api/test-supabase', async (req, res) => {
    try {
      const { data, error } = await supabase.from('spaces').select('*').limit(1);
      if (error) throw error;
      res.json({ success: true, data, supabaseUrl });
    } catch (e: any) {
      console.error('Supabase test failed:', e);
      res.status(500).json({ error: e.message, stack: e.stack, supabaseUrl });
    }
  });

  app.get('/api/spaces', async (req, res) => {
    try {
      const { profileId } = req.query;
      let query = supabase
        .from('spaces')
        .select('*')
        .order('order', { ascending: true })
        .order('createdAt', { ascending: false });
      
      if (profileId) {
        query = query.eq('profileId', profileId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Supabase error in GET /api/spaces:', error);
        throw error;
      }
      res.json(data);
    } catch (e: any) { 
      console.error('Error in GET /api/spaces:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error', details: e }); 
    }
  });

  app.post('/api/spaces', async (req, res) => {
    const { id, name, createdAt, order, profileId } = req.body;
    try {
      let finalOrder = order;
      if (finalOrder === undefined) {
        let query = supabase
          .from('spaces')
          .select('order')
          .order('order', { ascending: false })
          .limit(1);
        
        if (profileId) {
          query = query.eq('profileId', profileId);
        }

        const { data: maxData, error: maxError } = await query;
        
        if (maxError) {
          console.error('Supabase error fetching max order in POST /api/spaces:', maxError);
          throw maxError;
        }
        finalOrder = (maxData?.[0]?.order ?? -1) + 1;
      }

      const { error } = await supabase
        .from('spaces')
        .insert([{ id, name, order: finalOrder, createdAt, profileId }]);
      
      if (error) {
        console.error('Supabase error in POST /api/spaces:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in POST /api/spaces:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.put('/api/spaces/reorder', async (req, res) => {
    const { orders } = req.body;
    try {
      // Supabase doesn't have a built-in "update many with different values" in one call easily
      // without using RPC or multiple calls. For simplicity and reliability:
      const promises = orders.map((item: any) => 
        supabase.from('spaces').update({ order: item.order }).eq('id', item.id)
      );
      const results = await Promise.all(promises);
      const firstError = results.find(r => r.error)?.error;
      if (firstError) {
        console.error('Supabase error in PUT /api/spaces/reorder:', firstError);
        throw firstError;
      }
      
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in PUT /api/spaces/reorder:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.put('/api/spaces/:id', async (req, res) => {
    const { name } = req.body;
    try {
      const { error } = await supabase
        .from('spaces')
        .update({ name })
        .eq('id', req.params.id);
      
      if (error) {
        console.error('Supabase error in PUT /api/spaces/:id:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in PUT /api/spaces/:id:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.delete('/api/spaces/:id', async (req, res) => {
    try {
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', req.params.id);
      
      if (error) {
        console.error('Supabase error in DELETE /api/spaces/:id:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in DELETE /api/spaces/:id:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  // --- PROJECTS ---
  app.get('/api/projects', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('order', { ascending: true })
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Supabase error in GET /api/projects:', error);
        throw error;
      }
      res.json(data);
    } catch (e: any) { 
      console.error('Error in GET /api/projects:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error', details: e }); 
    }
  });

  app.post('/api/projects', async (req, res) => {
    const { id, spaceId, name, createdAt, order } = req.body;
    try {
      let finalOrder = order;
      if (finalOrder === undefined) {
        const { data: maxData, error: maxError } = await supabase
          .from('projects')
          .select('order')
          .eq('spaceId', spaceId)
          .order('order', { ascending: false })
          .limit(1);
        
        if (maxError) {
          console.error('Supabase error fetching max order in POST /api/projects:', maxError);
          throw maxError;
        }
        finalOrder = (maxData?.[0]?.order ?? -1) + 1;
      }

      const { error } = await supabase
        .from('projects')
        .insert([{ id, spaceId, name, order: finalOrder, createdAt }]);
      
      if (error) {
        console.error('Supabase error in POST /api/projects:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in POST /api/projects:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.put('/api/projects/reorder', async (req, res) => {
    const { orders } = req.body;
    try {
      const promises = orders.map((item: any) => 
        supabase.from('projects').update({ order: item.order, spaceId: item.spaceId }).eq('id', item.id)
      );
      const results = await Promise.all(promises);
      const firstError = results.find(r => r.error)?.error;
      if (firstError) {
        console.error('Supabase error in PUT /api/projects/reorder:', firstError);
        throw firstError;
      }
      
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in PUT /api/projects/reorder:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.put('/api/projects/:id', async (req, res) => {
    const updates = req.body;
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', req.params.id);
      
      if (error) {
        console.error('Supabase error in PUT /api/projects/:id:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in PUT /api/projects/:id:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', req.params.id);
      
      if (error) {
        console.error('Supabase error in DELETE /api/projects/:id:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in DELETE /api/projects/:id:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  // --- LISTS ---
  app.get('/api/lists', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .order('order', { ascending: true })
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Supabase error in GET /api/lists:', error);
        throw error;
      }
      res.json(data);
    } catch (e: any) { 
      console.error('Error in GET /api/lists:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error', details: e }); 
    }
  });

  app.post('/api/lists', async (req, res) => {
    const { id, projectId, name, baseUrl, description, createdAt, order } = req.body;
    try {
      let finalOrder = order;
      if (finalOrder === undefined) {
        const { data: maxData, error: maxError } = await supabase
          .from('lists')
          .select('order')
          .eq('projectId', projectId)
          .order('order', { ascending: false })
          .limit(1);
        
        if (maxError) {
          console.error('Supabase error fetching max order in POST /api/lists:', maxError);
          throw maxError;
        }
        finalOrder = (maxData?.[0]?.order ?? -1) + 1;
      }

      const { error } = await supabase
        .from('lists')
        .insert([{ id, projectId, name, baseUrl, description, order: finalOrder, createdAt }]);
      
      if (error) {
        console.error('Supabase error in POST /api/lists:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in POST /api/lists:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.put('/api/lists/reorder', async (req, res) => {
    const { orders } = req.body;
    try {
      const promises = orders.map((item: any) => 
        supabase.from('lists').update({ order: item.order, projectId: item.projectId }).eq('id', item.id)
      );
      const results = await Promise.all(promises);
      const firstError = results.find(r => r.error)?.error;
      if (firstError) {
        console.error('Supabase error in PUT /api/lists/reorder:', firstError);
        throw firstError;
      }
      
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in PUT /api/lists/reorder:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.put('/api/lists/:id', async (req, res) => {
    const updates = req.body;
    try {
      const { error } = await supabase
        .from('lists')
        .update(updates)
        .eq('id', req.params.id);
      
      if (error) {
        console.error('Supabase error in PUT /api/lists/:id:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in PUT /api/lists/:id:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.delete('/api/lists/:id', async (req, res) => {
    try {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', req.params.id);
      
      if (error) {
        console.error('Supabase error in DELETE /api/lists/:id:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in DELETE /api/lists/:id:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  // --- LINKS (UTMs) ---
  app.get('/api/links', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('createdAt', { ascending: false })
        .order('title', { ascending: true });
      
      if (error) {
        console.error('Supabase error in GET /api/links:', error);
        throw error;
      }
      res.json(data);
    } catch (e: any) { 
      console.error('Error in GET /api/links:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error', details: e }); 
    }
  });

  app.post('/api/links', async (req, res) => {
    try {
      const { error } = await supabase
        .from('links')
        .insert([req.body]);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post('/api/links/bulk', async (req, res) => {
    try {
      const { error } = await supabase
        .from('links')
        .insert(req.body);
      
      if (error) {
        console.error('Supabase error in POST /api/links/bulk:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in POST /api/links/bulk:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.put('/api/links/:id', async (req, res) => {
    try {
      const { error } = await supabase
        .from('links')
        .update(req.body)
        .eq('id', req.params.id);
      
      if (error) {
        console.error('Supabase error in PUT /api/links/:id:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in PUT /api/links/:id:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  app.delete('/api/links/:id', async (req, res) => {
    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', req.params.id);
      
      if (error) {
        console.error('Supabase error in DELETE /api/links/:id:', error);
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) { 
      console.error('Error in DELETE /api/links/:id:', e);
      res.status(400).json({ error: e.message || 'Bad Request', details: e }); 
    }
  });

  // --- DUPLICATION LOGIC ---
  const uuid = () => crypto.randomUUID();

  app.post('/api/duplicate/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const { targetParentId } = req.body;

    try {
      if (type === 'list') {
        const { data: list, error: listErr } = await supabase.from('lists').select('*').eq('id', id).single();
        if (listErr || !list) throw new Error('List not found');
        
        const newListId = uuid();
        const parentId = targetParentId || list.projectId;
        
        // Increment orders
        await supabase.rpc('increment_orders', { table_name: 'lists', parent_col: 'projectId', parent_id: parentId, start_order: list.order });
        // Note: RPC might be needed for atomic operations in Supabase if we want to mimic SQLite transactions perfectly.
        // For now, I'll use a simpler approach or suggest an RPC.
        // Actually, let's just do it sequentially for now as a simple migration.
        
        await supabase.from('lists').update({ order: list.order + 1 }).eq('projectId', parentId).gt('order', list.order);

        await supabase.from('lists').insert([{
          id: newListId,
          projectId: parentId,
          name: `${list.name} (Copy)`,
          baseUrl: list.baseUrl,
          description: list.description,
          order: list.order + 1,
          createdAt: Date.now()
        }]);
        
        const { data: links } = await supabase.from('links').select('*').eq('listId', id);
        if (links && links.length > 0) {
          const newLinks = links.map(link => ({
            ...link,
            id: uuid(),
            listId: newListId,
            createdAt: Date.now()
          }));
          await supabase.from('links').insert(newLinks);
        }
      } else if (type === 'project') {
        const { data: project, error: projErr } = await supabase.from('projects').select('*').eq('id', id).single();
        if (projErr || !project) throw new Error('Project not found');
        
        const newProjectId = uuid();
        const parentId = targetParentId || project.spaceId;

        await supabase.from('projects').update({ order: project.order + 1 }).eq('spaceId', parentId).gt('order', project.order);

        await supabase.from('projects').insert([{
          id: newProjectId,
          spaceId: parentId,
          name: `${project.name} (Copy)`,
          order: project.order + 1,
          createdAt: Date.now()
        }]);
        
        const { data: lists } = await supabase.from('lists').select('*').eq('projectId', id);
        if (lists) {
          for (const list of lists) {
            const newListId = uuid();
            await supabase.from('lists').insert([{
              id: newListId,
              projectId: newProjectId,
              name: list.name,
              baseUrl: list.baseUrl,
              description: list.description,
              order: list.order,
              createdAt: Date.now()
            }]);
            
            const { data: links } = await supabase.from('links').select('*').eq('listId', list.id);
            if (links && links.length > 0) {
              const newLinks = links.map(link => ({
                ...link,
                id: uuid(),
                listId: newListId,
                createdAt: Date.now()
              }));
              await supabase.from('links').insert(newLinks);
            }
          }
        }
      } else if (type === 'space') {
        const { data: space, error: spaceErr } = await supabase.from('spaces').select('*').eq('id', id).single();
        if (spaceErr || !space) throw new Error('Space not found');
        
        const newSpaceId = uuid();
        
        let updateQuery = supabase.from('spaces').update({ order: space.order + 1 }).gt('order', space.order);
        if (space.profileId) {
          updateQuery = updateQuery.eq('profileId', space.profileId);
        }
        await updateQuery;

        await supabase.from('spaces').insert([{
          id: newSpaceId,
          name: `${space.name} (Copy)`,
          order: space.order + 1,
          createdAt: Date.now(),
          profileId: space.profileId
        }]);
        
        const { data: projects } = await supabase.from('projects').select('*').eq('spaceId', id);
        if (projects) {
          for (const project of projects) {
            const newProjectId = uuid();
            await supabase.from('projects').insert([{
              id: newProjectId,
              spaceId: newSpaceId,
              name: project.name,
              order: project.order,
              createdAt: Date.now()
            }]);
            
            const { data: lists } = await supabase.from('lists').select('*').eq('projectId', project.id);
            if (lists) {
              for (const list of lists) {
                const newListId = uuid();
                await supabase.from('lists').insert([{
                  id: newListId,
                  projectId: newProjectId,
                  name: list.name,
                  baseUrl: list.baseUrl,
                  description: list.description,
                  order: list.order,
                  createdAt: Date.now()
                }]);
                
                const { data: links } = await supabase.from('links').select('*').eq('listId', list.id);
                if (links && links.length > 0) {
                  const newLinks = links.map(link => ({
                    ...link,
                    id: uuid(),
                    listId: newListId,
                    createdAt: Date.now()
                  }));
                  await supabase.from('links').insert(newLinks);
                }
              }
            }
          }
        }
      }
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

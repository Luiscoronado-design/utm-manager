import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key'
);

const app = express();
app.use(express.json());

// --- PROFILES ---
app.get('/api/profiles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, createdat')
      .order('createdat', { ascending: true });
    if (error) {
      if (error.code === '42P01') return res.json([]);
      throw error;
    }
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/profiles', async (req, res) => {
  const { id, name, password, createdAt } = req.body;
  try {
    const { error } = await supabase
      .from('profiles')
      .insert([{ id, name, password, createdat: createdAt }]);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(req.body)
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/profiles/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
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
    if (error) throw error;
    if (data && data.password === password) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- SPACES ---
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase.from('spaces').select('*').limit(1);
    if (error) throw error;
    res.json({ success: true, data, supabaseUrl });
  } catch (e: any) {
    res.status(500).json({ error: e.message, supabaseUrl });
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
    if (profileId) query = query.eq('profileId', profileId);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/spaces', async (req, res) => {
  const { id, name, createdAt, order, profileId } = req.body;
  try {
    let finalOrder = order;
    if (finalOrder === undefined) {
      let q = supabase.from('spaces').select('order').order('order', { ascending: false }).limit(1);
      if (profileId) q = q.eq('profileId', profileId);
      const { data: maxData, error: maxError } = await q;
      if (maxError) throw maxError;
      finalOrder = (maxData?.[0]?.order ?? -1) + 1;
    }
    const { error } = await supabase.from('spaces').insert([{ id, name, order: finalOrder, createdAt, profileId }]);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/spaces/reorder', async (req, res) => {
  const { orders } = req.body;
  try {
    const results = await Promise.all(
      orders.map((item: any) => supabase.from('spaces').update({ order: item.order }).eq('id', item.id))
    );
    const firstError = results.find(r => r.error)?.error;
    if (firstError) throw firstError;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/spaces/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('spaces').update({ name: req.body.name }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/spaces/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('spaces').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
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
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/projects', async (req, res) => {
  const { id, spaceId, name, createdAt, order } = req.body;
  try {
    let finalOrder = order;
    if (finalOrder === undefined) {
      const { data: maxData, error: maxError } = await supabase
        .from('projects').select('order').eq('spaceId', spaceId).order('order', { ascending: false }).limit(1);
      if (maxError) throw maxError;
      finalOrder = (maxData?.[0]?.order ?? -1) + 1;
    }
    const { error } = await supabase.from('projects').insert([{ id, spaceId, name, order: finalOrder, createdAt }]);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/projects/reorder', async (req, res) => {
  const { orders } = req.body;
  try {
    const results = await Promise.all(
      orders.map((item: any) =>
        supabase.from('projects').update({ order: item.order, spaceId: item.spaceId }).eq('id', item.id)
      )
    );
    const firstError = results.find(r => r.error)?.error;
    if (firstError) throw firstError;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('projects').update(req.body).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
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
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/lists', async (req, res) => {
  const { id, projectId, name, baseUrl, description, createdAt, order } = req.body;
  try {
    let finalOrder = order;
    if (finalOrder === undefined) {
      const { data: maxData, error: maxError } = await supabase
        .from('lists').select('order').eq('projectId', projectId).order('order', { ascending: false }).limit(1);
      if (maxError) throw maxError;
      finalOrder = (maxData?.[0]?.order ?? -1) + 1;
    }
    const { error } = await supabase.from('lists').insert([{ id, projectId, name, baseUrl, description, order: finalOrder, createdAt }]);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/lists/reorder', async (req, res) => {
  const { orders } = req.body;
  try {
    const results = await Promise.all(
      orders.map((item: any) =>
        supabase.from('lists').update({ order: item.order, projectId: item.projectId }).eq('id', item.id)
      )
    );
    const firstError = results.find(r => r.error)?.error;
    if (firstError) throw firstError;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/lists/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('lists').update(req.body).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/lists/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('lists').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
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
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/links', async (req, res) => {
  try {
    const { error } = await supabase.from('links').insert([req.body]);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/links/bulk', async (req, res) => {
  try {
    const { error } = await supabase.from('links').insert(req.body);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/links/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('links').update(req.body).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/links/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('links').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// --- DUPLICATION ---
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
      await supabase.from('lists').update({ order: list.order + 1 }).eq('projectId', parentId).gt('order', list.order);
      await supabase.from('lists').insert([{
        id: newListId, projectId: parentId, name: `${list.name} (Copy)`,
        baseUrl: list.baseUrl, description: list.description, order: list.order + 1, createdAt: Date.now()
      }]);
      const { data: links } = await supabase.from('links').select('*').eq('listId', id);
      if (links && links.length > 0) {
        await supabase.from('links').insert(links.map(link => ({ ...link, id: uuid(), listId: newListId, createdAt: Date.now() })));
      }
    } else if (type === 'project') {
      const { data: project, error: projErr } = await supabase.from('projects').select('*').eq('id', id).single();
      if (projErr || !project) throw new Error('Project not found');
      const newProjectId = uuid();
      const parentId = targetParentId || project.spaceId;
      await supabase.from('projects').update({ order: project.order + 1 }).eq('spaceId', parentId).gt('order', project.order);
      await supabase.from('projects').insert([{
        id: newProjectId, spaceId: parentId, name: `${project.name} (Copy)`, order: project.order + 1, createdAt: Date.now()
      }]);
      const { data: lists } = await supabase.from('lists').select('*').eq('projectId', id);
      if (lists) {
        for (const list of lists) {
          const newListId = uuid();
          await supabase.from('lists').insert([{
            id: newListId, projectId: newProjectId, name: list.name,
            baseUrl: list.baseUrl, description: list.description, order: list.order, createdAt: Date.now()
          }]);
          const { data: links } = await supabase.from('links').select('*').eq('listId', list.id);
          if (links && links.length > 0) {
            await supabase.from('links').insert(links.map(link => ({ ...link, id: uuid(), listId: newListId, createdAt: Date.now() })));
          }
        }
      }
    } else if (type === 'space') {
      const { data: space, error: spaceErr } = await supabase.from('spaces').select('*').eq('id', id).single();
      if (spaceErr || !space) throw new Error('Space not found');
      const newSpaceId = uuid();
      let updateQ = supabase.from('spaces').update({ order: space.order + 1 }).gt('order', space.order);
      if (space.profileId) updateQ = updateQ.eq('profileId', space.profileId);
      await updateQ;
      await supabase.from('spaces').insert([{
        id: newSpaceId, name: `${space.name} (Copy)`, order: space.order + 1, createdAt: Date.now(), profileId: space.profileId
      }]);
      const { data: projects } = await supabase.from('projects').select('*').eq('spaceId', id);
      if (projects) {
        for (const project of projects) {
          const newProjectId = uuid();
          await supabase.from('projects').insert([{
            id: newProjectId, spaceId: newSpaceId, name: project.name, order: project.order, createdAt: Date.now()
          }]);
          const { data: lists } = await supabase.from('lists').select('*').eq('projectId', project.id);
          if (lists) {
            for (const list of lists) {
              const newListId = uuid();
              await supabase.from('lists').insert([{
                id: newListId, projectId: newProjectId, name: list.name,
                baseUrl: list.baseUrl, description: list.description, order: list.order, createdAt: Date.now()
              }]);
              const { data: links } = await supabase.from('links').select('*').eq('listId', list.id);
              if (links && links.length > 0) {
                await supabase.from('links').insert(links.map(link => ({ ...link, id: uuid(), listId: newListId, createdAt: Date.now() })));
              }
            }
          }
        }
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default app;

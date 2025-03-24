<script lang="ts">
    import { supabase } from '$lib/supabase';
    import type { PageData } from './$types';
    import type { Project, Note, LlmSource, Topic } from '$lib/types';
    
    export let data: PageData;
    
    let project = data.project;
    let notes = data.notes;
    let llmSources = data.llmSources;
    let topics = data.topics;
    
    let error: string | null = null;
    let searchQuery = '';
    let filteredNotes = notes;
    
    // New note form state
    let newNote = {
      content: '',
      llm_source_id: llmSources.length > 0 ? llmSources[0].id : '',
      topic_id: topics.length > 0 ? topics[0].id : ''
    };
    let creating = false;
    
    // Search functionality
    function searchNotes() {
      if (!searchQuery.trim()) {
        filteredNotes = notes;
        return;
      }
      
      const query = searchQuery.toLowerCase().trim();
      filteredNotes = notes.filter(note => 
        note.content.toLowerCase().includes(query) ||
        note.llm_sources?.name?.toLowerCase().includes(query) ||
        note.topics?.name?.toLowerCase().includes(query)
      );
    }
    
    // Create new note
    async function createNote() {
      if (!newNote.content.trim() || !newNote.llm_source_id || !newNote.topic_id) {
        error = 'Please fill in all required fields';
        return;
      }
      
      try {
        creating = true;
        error = null;
        
        const { data: createdNote, error: insertError } = await supabase
          .from('notes')
          .insert([{
            project_id: project.id,
            content: newNote.content,
            llm_source_id: newNote.llm_source_id,
            topic_id: newNote.topic_id
          }])
          .select(`
            *,
            llm_sources (id, name),
            topics (id, name)
          `);
        
        if (insertError) throw insertError;
        
        if (createdNote && createdNote.length > 0) {
          notes = [createdNote[0], ...notes];
          filteredNotes = [createdNote[0], ...filteredNotes];
          
          // Reset form
          newNote.content = '';
          newNote.llm_source_id = llmSources.length > 0 ? llmSources[0].id : '';
          newNote.topic_id = topics.length > 0 ? topics[0].id : '';
        }
      } catch (e) {
        console.error('Error creating note:', e);
        error = 'Could not create note. Please try again.';
      } finally {
        creating = false;
      }
    }
    
    function formatDate(dateString: string): string {
      return new Date(dateString).toLocaleDateString();
    }
  
    $: {
      searchNotes();
    }
  </script>
  
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{project.title}</h1>
          {#if project.description}
            <p class="mt-1 text-sm text-gray-600">{project.description}</p>
          {/if}
        </div>
        <a 
          href="/" 
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Back to Projects
        </a>
      </div>
    </header>
    
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Error message -->
      {#if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      {/if}
      
      <!-- Search bar -->
      <div class="mb-6">
        <div class="relative rounded-md shadow-sm">
          <input
            bind:value={searchQuery}
            type="text" 
            class="block w-full rounded-md border-gray-300 pl-4 pr-10 py-2 focus:border-indigo-500 focus:ring-indigo-500 border"
            placeholder="Search notes..."
            on:input={searchNotes}
          />
          <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      
      <!-- New Note Form -->
      <div class="bg-white shadow sm:rounded-lg mb-6 p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Add New Note</h2>
        <form on:submit|preventDefault={createNote} class="space-y-4">
          <div>
            <label for="content" class="block text-sm font-medium text-gray-700">Note Content</label>
            <textarea
              bind:value={newNote.content}
              id="content"
              rows="4"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter note content"
              required
            ></textarea>
          </div>
          
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="llm_source" class="block text-sm font-medium text-gray-700">LLM Source</label>
              <select
                bind:value={newNote.llm_source_id}
                id="llm_source"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                {#each llmSources as source}
                  <option value={source.id}>{source.name}</option>
                {/each}
              </select>
            </div>
            
            <div>
              <label for="topic" class="block text-sm font-medium text-gray-700">Topic</label>
              <select
                bind:value={newNote.topic_id}
                id="topic"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                {#each topics as topic}
                  <option value={topic.id}>{topic.name}</option>
                {/each}
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={creating}
            class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Add Note'}
          </button>
        </form>
      </div>
      
      <!-- Notes List -->
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h2 class="text-lg font-medium text-gray-900">Notes</h2>
          <span class="text-sm text-gray-500">{filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}</span>
        </div>
        
        {#if filteredNotes.length === 0}
          <div class="px-4 py-5 sm:p-6 text-center text-gray-500">
            {searchQuery ? 'No notes match your search.' : 'No notes yet. Add your first note above.'}
          </div>
        {:else}
          <ul class="divide-y divide-gray-200">
            {#each filteredNotes as note}
              <li class="px-4 py-4 sm:px-6">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {note.llm_sources?.name || 'Unknown LLM'}
                    </span>
                    <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {note.topics?.name || 'Uncategorized'}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500">
                    {formatDate(note.created_at)}
                  </p>
                </div>
                
                <div class="prose max-w-none">
                  <p class="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </main>
  </div>
<script lang="ts">
    import { supabase } from '$lib/supabase';
    import type { PageData } from './$types';
    import type { Project, Note, LlmSource, Topic, Tag } from '$lib/types';
    
    export let data: PageData;
    
    let project = data.project;
    let notes = data.notes;
    let llmSources = data.llmSources;
    let topics = data.topics;
    let tags = data.tags;
    
    let error: string | null = null;
    let searchQuery = '';
    let filteredNotes = notes;
    let selectedTags: string[] = [];
    
    // New note form state
    let newNote = {
      content: '',
      llm_source_id: llmSources.length > 0 ? llmSources[0].id : '',
      topic_id: topics.length > 0 ? topics[0].id : ''
    };
    let creating = false;
    let tagInput = '';
    let selectedTagIds: string[] = [];
    
    // Edit note state
    let editingNoteId: string | null = null;
    let editNote = {
      content: '',
      llm_source_id: '',
      topic_id: ''
    };
    let editingTagIds: string[] = [];
    let editTagInput = '';
    let updating = false;
    
    // Start editing a note
    function startEditingNote(note: Note) {
      editingNoteId = note.id;
      editNote = {
        content: note.content,
        llm_source_id: note.llm_source_id,
        topic_id: note.topic_id
      };
      editingTagIds = note.tags ? note.tags.map(tag => tag.id) : [];
      editTagInput = '';
    }
    
    // Cancel editing
    function cancelEditing() {
      editingNoteId = null;
    }
    
    // Update a note
    async function updateNote() {
      if (!editNote.content.trim() || !editNote.llm_source_id || !editNote.topic_id) {
        error = 'Please fill in all required fields';
        return;
      }
      
      try {
        updating = true;
        error = null;
        
        // Update note
        const { data: updatedNote, error: updateError } = await supabase
          .from('notes')
          .update({
            content: editNote.content,
            llm_source_id: editNote.llm_source_id,
            topic_id: editNote.topic_id
          })
          .eq('id', editingNoteId)
          .select(`
            *,
            llm_sources (id, name),
            topics (id, name)
          `);
        
        if (updateError) throw updateError;
        
        if (updatedNote && updatedNote.length > 0) {
          // First, remove all existing tags for this note
          const { error: deleteTagsError } = await supabase
            .from('note_tags')
            .delete()
            .eq('note_id', editingNoteId);
            
          if (deleteTagsError) throw deleteTagsError;
          
          // Then add new tags
          if (editingTagIds.length > 0) {
            const noteTagsToInsert = editingTagIds.map(tagId => ({
              note_id: editingNoteId,
              tag_id: tagId
            }));
            
            const { error: tagLinkError } = await supabase
              .from('note_tags')
              .insert(noteTagsToInsert);
              
            if (tagLinkError) throw tagLinkError;
            
            // Add tags to the updated note object for display
            updatedNote[0].tags = tags.filter(tag => editingTagIds.includes(tag.id));
          } else {
            updatedNote[0].tags = [];
          }
          
          // Update notes array
          notes = notes.map(note => 
            note.id === editingNoteId ? updatedNote[0] : note
          );
          
          // Update filtered notes
          filteredNotes = filteredNotes.map(note => 
            note.id === editingNoteId ? updatedNote[0] : note
          );
          
          // Exit edit mode
          editingNoteId = null;
        }
      } catch (e) {
        console.error('Error updating note:', e);
        error = 'Could not update note. Please try again.';
      } finally {
        updating = false;
      }
    }
    
    // Tag handling functions
    async function addTag() {
      if (!tagInput.trim()) return;
      
      // Check if tag already exists
      let existingTag = tags.find(t => t.name.toLowerCase() === tagInput.trim().toLowerCase());
      
      if (existingTag) {
        // Use existing tag if not already selected
        if (!selectedTagIds.includes(existingTag.id)) {
          selectedTagIds = [...selectedTagIds, existingTag.id];
        }
      } else {
        // Create new tag
        try {
          const { data: newTag, error: tagError } = await supabase
            .from('tags')
            .insert([{ name: tagInput.trim() }])
            .select();
            
          if (tagError) throw tagError;
          
          if (newTag && newTag.length > 0) {
            tags = [...tags, newTag[0]];
            selectedTagIds = [...selectedTagIds, newTag[0].id];
          }
        } catch (e) {
          console.error('Error creating tag:', e);
          error = 'Could not create tag. Please try again.';
          return;
        }
      }
      
      // Clear tag input
      tagInput = '';
    }
    
    async function addEditTag() {
      if (!editTagInput.trim()) return;
      
      // Check if tag already exists
      let existingTag = tags.find(t => t.name.toLowerCase() === editTagInput.trim().toLowerCase());
      
      if (existingTag) {
        // Use existing tag if not already selected
        if (!editingTagIds.includes(existingTag.id)) {
          editingTagIds = [...editingTagIds, existingTag.id];
        }
      } else {
        // Create new tag
        try {
          const { data: newTag, error: tagError } = await supabase
            .from('tags')
            .insert([{ name: editTagInput.trim() }])
            .select();
            
          if (tagError) throw tagError;
          
          if (newTag && newTag.length > 0) {
            tags = [...tags, newTag[0]];
            editingTagIds = [...editingTagIds, newTag[0].id];
          }
        } catch (e) {
          console.error('Error creating tag:', e);
          error = 'Could not create tag. Please try again.';
          return;
        }
      }
      
      // Clear tag input
      editTagInput = '';
    }
    
    function removeTag(tagId: string) {
      selectedTagIds = selectedTagIds.filter(id => id !== tagId);
    }
    
    function removeEditTag(tagId: string) {
      editingTagIds = editingTagIds.filter(id => id !== tagId);
    }
    
    // Filter notes by tag
    function filterByTag(tagId: string) {
      if (selectedTags.includes(tagId)) {
        // Remove tag from filter
        selectedTags = selectedTags.filter(id => id !== tagId);
      } else {
        // Add tag to filter
        selectedTags = [...selectedTags, tagId];
      }
      
      // Apply filters
      applyFilters();
    }
    
    function applyFilters() {
      // Start with search query filter
      let filtered = notes;
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(note => 
          note.content.toLowerCase().includes(query) ||
          note.llm_sources?.name?.toLowerCase().includes(query) ||
          note.topics?.name?.toLowerCase().includes(query)
        );
      }
      
      // Apply tag filters if any are selected
      if (selectedTags.length > 0) {
        filtered = filtered.filter(note => {
          if (!note.tags) return false;
          // Note passes filter if it has at least one of the selected tags
          return note.tags.some((tag: Tag) => selectedTags.includes(tag.id));
        });
      }
      
      filteredNotes = filtered;
    }
    
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
    
    // Create new note with tags
    async function createNote() {
      if (!newNote.content.trim() || !newNote.llm_source_id || !newNote.topic_id) {
        error = 'Please fill in all required fields';
        return;
      }
      
      try {
        creating = true;
        error = null;
        
        // Insert note
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
          // Add tags to note
          if (selectedTagIds.length > 0) {
            const noteTagsToInsert = selectedTagIds.map(tagId => ({
              note_id: createdNote[0].id,
              tag_id: tagId
            }));
            
            const { error: tagLinkError } = await supabase
              .from('note_tags')
              .insert(noteTagsToInsert);
              
            if (tagLinkError) throw tagLinkError;
            
            // Add tags to the created note object for display
            createdNote[0].tags = tags.filter(tag => selectedTagIds.includes(tag.id));
          } else {
            createdNote[0].tags = [];
          }
          
          notes = [createdNote[0], ...notes];
          filteredNotes = [createdNote[0], ...filteredNotes];
          
          // Reset form
          newNote.content = '';
          newNote.llm_source_id = llmSources.length > 0 ? llmSources[0].id : '';
          newNote.topic_id = topics.length > 0 ? topics[0].id : '';
          selectedTagIds = [];
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
      if (searchQuery !== undefined) {
        applyFilters();
      }
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
          
          <div>
            <label for="tags" class="block text-sm font-medium text-gray-700">Tags</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input
                bind:value={tagInput}
                type="text"
                id="tags"
                class="flex-1 min-w-0 block rounded-none rounded-l-md border-gray-300 p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Add tags..."
                on:keyup={e => e.key === 'Enter' && addTag()}
              />
              <button
                type="button"
                on:click={addTag}
                class="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm"
              >
                Add
              </button>
            </div>
            
            <!-- Selected Tags -->
            {#if selectedTagIds.length > 0}
              <div class="mt-2 flex flex-wrap gap-2">
                {#each selectedTagIds as tagId}
                  {#if tags.find(t => t.id === tagId)}
                    {@const tag = tags.find(t => t.id === tagId)}
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {tag.name}
                      <button 
                        type="button" 
                        class="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none focus:bg-indigo-500 focus:text-white"
                        on:click={() => removeTag(tagId)}
                      >
                        <span class="sr-only">Remove tag</span>
                        <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                          <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                        </svg>
                      </button>
                    </span>
                  {/if}
                {/each}
              </div>
            {/if}
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
      
      <!-- Tag filtering UI -->
      <div class="bg-white shadow sm:rounded-lg mb-6 p-4">
        <h3 class="text-sm font-medium text-gray-700 mb-2">Filter by Tag</h3>
        <div class="flex flex-wrap gap-2">
          {#each tags as tag}
            <button
              type="button"
              class="inline-flex items-center px-2.5 py-1.5 border rounded-full text-xs font-medium 
              {selectedTags.includes(tag.id) 
                ? 'bg-indigo-100 text-indigo-800 border-indigo-300' 
                : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'}"
              on:click={() => filterByTag(tag.id)}
            >
              {tag.name}
              {#if selectedTags.includes(tag.id)}
                <svg class="ml-1.5 h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                  <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
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
                {#if editingNoteId === note.id}
                  <!-- Edit Note Form -->
                  <form on:submit|preventDefault={updateNote} class="space-y-4">
                    <div>
                      <label for="edit-content" class="block text-sm font-medium text-gray-700">Note Content</label>
                      <textarea
                        bind:value={editNote.content}
                        id="edit-content"
                        rows="4"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Enter note content"
                        required
                      ></textarea>
                    </div>
                    
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label for="edit-llm-source" class="block text-sm font-medium text-gray-700">LLM Source</label>
                        <select
                          bind:value={editNote.llm_source_id}
                          id="edit-llm-source"
                          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        >
                          {#each llmSources as source}
                            <option value={source.id}>{source.name}</option>
                          {/each}
                        </select>
                      </div>
                      
                      <div>
                        <label for="edit-topic" class="block text-sm font-medium text-gray-700">Topic</label>
                        <select
                          bind:value={editNote.topic_id}
                          id="edit-topic"
                          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        >
                          {#each topics as topic}
                            <option value={topic.id}>{topic.name}</option>
                          {/each}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label for="edit-tags" class="block text-sm font-medium text-gray-700">Tags</label>
                      <div class="mt-1 flex rounded-md shadow-sm">
                        <input
                          bind:value={editTagInput}
                          type="text"
                          id="edit-tags"
                          class="flex-1 min-w-0 block rounded-none rounded-l-md border-gray-300 p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="Add tags..."
                          on:keyup={e => e.key === 'Enter' && addEditTag()}
                        />
                        <button
                          type="button"
                          on:click={addEditTag}
                          class="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm"
                        >
                          Add
                        </button>
                      </div>
                      
                      <!-- Selected Tags -->
                      {#if editingTagIds.length > 0}
                        <div class="mt-2 flex flex-wrap gap-2">
                          {#each editingTagIds as tagId}
                            {#if tags.find(t => t.id === tagId)}
                              {@const tag = tags.find(t => t.id === tagId)}
                              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {tag.name}
                                <button 
                                  type="button" 
                                  class="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none focus:bg-indigo-500 focus:text-white"
                                  on:click={() => removeEditTag(tagId)}
                                >
                                  <span class="sr-only">Remove tag</span>
                                  <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                                    <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                                  </svg>
                                </button>
                              </span>
                            {/if}
                          {/each}
                        </div>
                      {/if}
                    </div>
          
                    <div class="flex gap-2">
                      <button
                        type="submit"
                        disabled={updating}
                        class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {updating ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        on:click={cancelEditing}
                        class="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                {:else}
                  <!-- Note Display -->
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-2">
                      <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {note.llm_sources?.name || 'Unknown LLM'}
                      </span>
                      <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {note.topics?.name || 'Uncategorized'}
                      </span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <p class="text-xs text-gray-500">
                        {formatDate(note.created_at)}
                      </p>
                      <button
                        type="button"
                        on:click={() => startEditingNote(note)}
                        class="text-indigo-600 hover:text-indigo-900"
                        title="Edit Note"
                        aria-label="Edit Note"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Note Tags -->
                  {#if note.tags && note.tags.length > 0}
                    <div class="flex flex-wrap gap-1 mb-2">
                      {#each note.tags as tag}
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {tag.name}
                        </span>
                      {/each}
                    </div>
                  {/if}
                  
                  <div class="prose max-w-none">
                    <p class="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </main>
  </div>
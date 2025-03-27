<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  // Define types for our data
  interface Project {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    is_archived: boolean;
    recentNote?: any; // To hold the recent note
  }
  
  // Define the type for page data
  interface PageData {
    projects: Project[];
  }
  
  // Properly type the data prop
  export let data: PageData = { projects: [] };

  let projects = data.projects || [];
  let loading: boolean = false;
  let error: string | null = null;
  
  // Form state for creating a new project
  let newProject = {
    title: '',
    description: ''
  };
  let creating: boolean = false;
  
  // Modal state
  let showModal: boolean = false;

  // Function to toggle modal
  function toggleModal() {
    showModal = !showModal;
    if (!showModal) {
      // Reset form when closing
      newProject.title = '';
      newProject.description = '';
    }
  }

  async function createProject() {
    if (!newProject.title.trim()) {
      return;
    }

    try {
      creating = true;
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([{ 
          title: newProject.title,
          description: newProject.description
        }])
        .select();
      
      if (insertError) throw insertError;
      
      // Add new project to the list
      if (data && data.length > 0) {
        projects = [{ ...data[0], recentNote: null }, ...projects];
        
        // Close modal
        toggleModal();
      }
      
    } catch (e) {
      console.error('Error creating project:', e);
      error = 'Could not create project. Please try again.';
    } finally {
      creating = false;
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
  
  // Function to truncate note content for preview
  function truncateContent(content: string, maxLength: number = 100): string {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  }
</script>

<div class="min-h-screen bg-gray-100">
  <header class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold text-gray-900">Project Notes App</h1>
    </div>
  </header>
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <!-- Error message -->
    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    {/if}
    
    <!-- Projects List with New Project Button -->
    <div class="bg-white shadow sm:rounded-lg mb-6">
      <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h2 class="text-lg font-medium text-gray-900">Your Projects</h2>
        <button
          type="button"
          on:click={toggleModal}
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          New Project
        </button>
      </div>
      
      {#if loading}
        <div class="px-4 py-5 sm:p-6 text-center text-gray-500">
          Loading projects...
        </div>
      {:else if projects.length === 0}
        <div class="px-4 py-5 sm:p-6 text-center text-gray-500">
          No projects yet. Click the "New Project" button to create your first project.
        </div>
      {:else}
        <ul class="divide-y divide-gray-200">
          {#each projects as project}
            <li>
              <a href="/project/{project.id}" class="block hover:bg-gray-50">
                <div class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-indigo-600 truncate">
                      {project.title}
                    </p>
                    <div class="ml-2 flex-shrink-0 flex">
                      <p class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Updated: {formatDate(project.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div class="mt-2 sm:flex sm:justify-between">
                    <div class="sm:flex">
                      <p class="flex items-center text-sm text-gray-500">
                        {project.description || 'No description'}
                      </p>
                    </div>
                    <div class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        Created: {formatDate(project.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <!-- Recent Note Information -->
                  {#if project.recentNote}
                    <div class="mt-3 border-t border-gray-100 pt-3">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-medium text-gray-500">Latest Note:</span>
                        {#if project.recentNote.llm_sources}
                          <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {project.recentNote.llm_sources.name}
                          </span>
                        {/if}
                        {#if project.recentNote.topics}
                          <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            {project.recentNote.topics.name}
                          </span>
                        {/if}
                      </div>
                      <p class="mt-1 text-sm text-gray-600 overflow-hidden text-ellipsis">
                        {truncateContent(project.recentNote.content)}
                      </p>
                    </div>
                  {/if}
                </div>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </main>
</div>

<!-- Modal for creating new project -->
{#if showModal}
  <div class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" on:click={toggleModal}></div>
      
      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Create New Project
              </h3>
              <div class="mt-4">
                <form on:submit|preventDefault={createProject} class="space-y-4">
                  <div>
                    <label for="title" class="block text-sm font-medium text-gray-700">Project Title</label>
                    <input
                      bind:value={newProject.title}
                      type="text"
                      id="title"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter project title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label for="description" class="block text-sm font-medium text-gray-700">Description (optional)</label>
                    <textarea
                      bind:value={newProject.description}
                      id="description"
                      rows="3"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter project description"
                    ></textarea>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            on:click={createProject}
            disabled={creating}
            class="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
          <button
            type="button"
            on:click={toggleModal}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
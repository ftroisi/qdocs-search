# Searchbar

The goal of this project is to embed a server-side search bar into `src/app/page.tsx`. This project should be runnable with a local next.js server, i.e. `npm run dev`.  

## Instructions

1. Create a directory `sphinx`cd into it. Clone the following repositories:

    * git clone https://github.com/Quantinuum/guppy-docs
    * git clone https://github.com/Quantinuum/pytket-docs

2. Install the projects. 

3. Run the projects and generate a searchindex.js file. It should be located in the build directory of the sphinx run. There should be a searchindex.js for each project.

4. Copy the searchindex.js into public/tket/searchindex.js and public/guppy/searchindex.js

5. Add a client `Input` component to `src/app/page.tsx`. This component will make API calls using GET method to server-side results function. The server-side function will load the two *.js files, extract the underlying JSON and index it. Remember each `searchindex.js` corresponds to documentation content served from `/tket/` and `/guppy/`. The goal is to return titles and page paths corresponding to a topic a user has searched. 

## Deliverables

1. A branch corresponding to the source code.

1. A slide deck summarizing and desribing key challenges and design decisions to build server-side search component. Emphasize any design decisions that resolve a performance bottleneck.

1. Summarize how the chosen search results improve the user experience for the end users of the documentation platform.

1. Add a forward-looking write-up on how this would scale as more projects are added, and as documentation search terms increase. For example, would we need to change the JSON schema or use a production-ready database.

1. Describe potential integration tests you can use to test build quality and page links.

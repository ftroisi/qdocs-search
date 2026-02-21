# MDX migration

The goal of this project is to migrate from Restructered Text to MDX. A key part of the project is to show how equations, csv tables, code-blocks and jupyter notebooks can be integrated into MDX. The project should be runnable as a local webserver via `npm run dev`.

## Instructions

1. Convert these two pages into MDX files that can be build with the Next.JS project. The pages URL are:
    1. https://docs.quantinuum.com/systems/user_guide/hardware_user_guide/helios.html
    1. https://docs.quantinuum.com/systems/trainings/helios/getting_started/gate_streaming.html

1. These pages should be accessible via `/src/app/page.tsx`

1. Any additional components developed must sit in another folder, i.e. `/src/app/_components`.

1. Add a Next.JS command to test jupyter notebook execution prior to build.


## Deliverables

1. A branch corresponding to the source code.

1. A slide deck summarizing and desribing key challenges and design decisions to build server-side search component. Emphasize any design decisions that resolve a performance bottleneck.

1. Summarize how the chosen search results improve the user experience for the end users of the documentation platform.

1. Add a forward-looking write-up on how this would scale as more projects are added, and as documentation search terms increase. For example, would we need to change the JSON schema or use a production-ready database.

1. Describe potential integration tests you can use to test build quality and page links.

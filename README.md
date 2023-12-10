# Roam search+

> Search keywords do not need to be in a block

<img width="1095" alt="image" src="https://user-images.githubusercontent.com/23192045/218399890-bc7699fe-207e-417b-a46d-7c0ef0fdfbe8.png">

<img width="983" alt="image" src="https://user-images.githubusercontent.com/23192045/218399872-1e4a8f78-1122-41fa-a87f-27981b3b151c.png">



<div>
<img width="300" alt="image" src="https://user-images.githubusercontent.com/23192045/210167099-6b68c752-b305-45d8-b07e-2499febd4108.png">
<img width="300" alt="image" src="https://user-images.githubusercontent.com/23192045/210167100-f2d110a1-d124-4bec-b1b3-27fff687eded.png">
</div>

## New Features

### Inline search

![inline search](https://github.com/dive2Pro/roam-search-plus/assets/23192045/68903538-250f-4d54-95fd-01aa975327b6)

**How to use it**

place `{{search+}}` in a block


<details><summary>Details</summary>
<p>

- **Divided into Two Parts**: The first part is the **Filter**, where you can set query logic. The second part displays the query results, including a further filtering bar, a side list displaying the results, and a view showing the selected results.

- **In the First Part**, there are various query logic chains:
    - You can choose **Content**, representing the content of Pages and Blocks. After selecting it, you can choose further operations. For example, if I choose "contains" and input "roam," it means I want to query all pages and blocks with content containing "roam."
        - The meaning of each option:
            - contains: includes
            - does not contain: does not include
            - regex: supports Regex operations with built-in options
            - equals to: content equals the title or block
            - does not equal to: not (equals to)
            - is empty: find blocks with empty content
            - is not empty: find blocks or pages with non-empty content
    - Page ref and Block ref have the same meaning for operation options. 
        - **Hierarchical search**: Indicates a hierarchical relationship between the target and filtering conditions.
            - under any of: the target block has children blocks containing page ref or block ref
            - not under any of: the target block is not under related page ref or block ref's children blocks
        - **Inline search**: Indicates conditions apply on the same block.
            - contains any of: contains 1 or more refs
            - contains: contains all refs
            - does not contain: does not contain listed refs; the block may have other refs
            - is empty: block or page without refs
            - is not empty: block or page with refs
    - **Created time** and **Edited time** represent the creation and modification time of pages and blocks.
        - equals to: within a specific time frame, with a minimum unit of a day
        - does not equal to: not within a specific time frame
        - greater than: after that time point
        - not less than: not earlier than that time point
        - less than: before that time point
        - not greater than: not later than that time point
    - Every time an input box loses focus or "enter" is pressed during input, an immediate query can be performed.

- **In the Second Part**,
    - Two means are provided to further filter the query results:
        - **Filter input**
            - Supports fuzzy search
                - Generally speaking, fuzzy searching, more formally known as **approximate string matching**, is the technique of finding strings that are approximately equal to a given pattern.
        - **Page or block selection**
    - **Result view**
        - **Side menu**
            - Displays all results that meet the conditions.
        - **Edit view**
            - Allows direct editing of selected results.



</p>
</details> 

## Features

- search within specific pages
- search within a specific time range
- sort by 
  - priority: page title, block, keywords
  - modified time
  - created time
- supports "expressions in quotes" and case intensive
- supports copy result as references
- open in main window or sidebar
- record your queries and browsing history

## Usage

You can open the search dialog in two ways

- click in sidebar menu ![image](https://user-images.githubusercontent.com/23192045/224223069-22f2bf6b-df13-4d0f-9e0d-087ae017175c.png)

- ctrl + shift + p


## TODO

- [x] more accurate context
- [x] users involve
- [X] mobile support
- [x] performance improvement
- [x] embed mode
- [x] multiple choice
- [x] tags involve
- [ ] RegExp search
- [ ] panel settings
- [x] save inputs as config like tab
- [ ] arrow key to select
- [ ] resistance to typos
- [ ] toggle Exactly


CIS 566 Homework 6: City Generation

## Overview

Matthew Riley\
PennKey: matriley\
Live at: https://mgriley.github.io/hw06-city-generation/

![](demo_shot.png)

![](demo_with_den.png)
Here is the population density shown over the terrain. The back regions are low density and white regions high density.

![](den_closeup.png)
Buildings constructed in regions of low population density are smaller, to indicate residential areas.

![](den_topview.png)
Here is the same population density grid displayed from the top.

![](grid_water_pic.png)
This screenshot shows a debug rendering of the validity grid, where the color of each grid square indicates the land height at that location.

## Description:

Here is an ovewview of what I accomplished:

Done:
- Generates a terrain mesh from noise texture generated on the GPU
- Generates and draws a road network upon the land regions
- Rasterizes the land height to a grid, for easier lookup
- Randomly selects points to use for building locations, using the grid to locations in water
- Generates cylindrical buildings whose sizes vary with the population density at the chosen point
- The buildings have very slight color variation to give the appearance of rust but are otherwise untextured

Not done:

- Rasterize the roads to the viability grid such that no towers are built over roads. Right now the grid is only used to enforce that buildings aren't made over water.
- Complex building geometry. I did not use the technique described in the paper. All of my buildings are scaled cylinders.
- Procedural texturing of buildings. My buildings have some slight random color variation per-instance but aren't textured.
- Artistic lighting
- Procedural sky background


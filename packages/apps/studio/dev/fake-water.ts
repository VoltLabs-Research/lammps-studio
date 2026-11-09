export const WATER_SIMULATION_ID = 'water-box';

export const WATER_SCRIPT = `# TIP4P/2005 water, 4096 molecules, NPT at 300 K
# Entry point for this folder. Studio did not pick it up because
# it is not called main.in.

units           real
atom_style      full
boundary        p p p

include         setup.lammps
read_data       tip4p.data

pair_style      lj/cut/tip4p/long 1 2 1 1 0.1546 8.5
kspace_style    pppm/tip4p 1.0e-5
bond_style      zero
angle_style     zero

fix             rigid all shake 1e-4 100 0 b 1 a 1
fix             npt all npt temp 300 300 100 iso 1 1 1000

thermo          500
run             200000
`;

export const WATER_SETUP = `# Shared settings for the water box, included by water.lmp

neighbor        2.0 bin
neigh_modify    every 1 delay 0 check yes
special_bonds   lj/coul 0.0 0.0 0.5

variable        T equal 300
variable        P equal 1.0
timestep        2.0
`;

export const WATER_DATA_HEADER = `LAMMPS data file via write_data, version 22 Jul 2025, timestep = 0, units = real

12288 atoms
2 atom types
8192 bonds
1 bond types
4096 angles
1 angle types

0 49.66 xlo xhi
0 49.66 ylo yhi
0 49.66 zlo zhi

Masses

1 15.9994
2 1.008

Atoms # full
`;

export const WATER_README = `# Water box

TIP4P/2005 water, 4096 molecules in a 49.7 Å box, NPT at 300 K and 1 atm.

- water.lmp is the input script. It includes setup.lammps and reads tip4p.data.
- tip4p.data holds the equilibrated configuration written by write_data.
`;

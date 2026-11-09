export const CU_SCRIPT = `# Uniaxial tension of a <100> Cu nanowire, 4.3 nm across
# EAM potential: Mishin et al., PRB 63, 224106 (2001)

units           metal
boundary        s s p
atom_style      atomic

variable        T      index 300
variable        erate  index 0.001      # 1/ps, i.e. 1e9 1/s
variable        seed   index 48213
variable        L      equal 40

lattice         fcc 3.615
region          box block -10 10 -10 10 0 \${L}
create_box      1 box
region          wire cylinder z 0 0 5.95 INF INF
create_atoms    1 region wire

pair_style      eam/alloy
pair_coeff      * * potentials/Cu01.eam.alloy Cu

neighbor        2.0 bin
neigh_modify    every 1 delay 0 check yes

compute         pe all pe/atom
compute         cna all cna/atom 3.08

# --- equilibrate at T ----------------------------------------
velocity        all create \${T} \${seed} mom yes rot yes dist gaussian
fix             nvt all nvt temp \${T} \${T} 0.1
thermo          1000
thermo_style    custom step temp pe ke etotal press
run             20000

# --- pull along z --------------------------------------------
reset_timestep  0
variable        tmp    equal lz
variable        L0     equal \${tmp}
variable        strain equal (lz-v_L0)/v_L0
variable        stress equal -pzz/10000      # GPa

fix             pull all deform 1 z erate \${erate} units box remap x
thermo_style    custom step temp pe ke etotal press lz v_strain v_stress

dump            traj all custom 2000 wire.lammpstrj id type x y z c_pe c_cna
restart         50000 restart.*.cu
run             500000

write_data      final.data
`;

export const CU_README = `# Cu nanowire tension

Uniaxial tension of a <100> Cu nanowire, 4.3 nm across and 14.5 nm long,
pulled along z at 1e9 1/s after 20 ps of NVT at 300 K.

- main.in is the input script.
- potentials/Cu01.eam.alloy is the EAM potential of Mishin et al. (2001).
- runs/ holds one folder per run with its log, dump and restart files.

Override T, erate or seed for one run without editing main.in.
`;

export type StyleCommand =
    | 'pair_style'
    | 'bond_style'
    | 'angle_style'
    | 'dihedral_style'
    | 'improper_style'
    | 'kspace_style'
    | 'atom_style'
    | 'fix'
    | 'compute'
    | 'dump'
    | 'run_style'
    | 'command'
    | 'package'
    | 'suffix';

export interface StyleRule{
    command: StyleCommand;
    pattern: RegExp;
    name: string | null;
}

export interface AcceleratorSuffix{
    pattern: RegExp;
    name: string;
}

const rule = (command: StyleCommand, pattern: RegExp, name: string | null): StyleRule => ({ command, pattern, name });

const BONDED = ['bond_style', 'angle_style', 'dihedral_style', 'improper_style'] as const;

const bonded = (pattern: RegExp, name: string | null): StyleRule[] => {
    return BONDED.map((command) => rule(command, pattern, name));
};

export const ACCELERATOR_SUFFIXES: AcceleratorSuffix[] = [
    { pattern: /\/omp$/, name: 'OPENMP' },
    { pattern: /\/kk(?:\/host|\/device)?$/, name: 'KOKKOS' },
    { pattern: /\/gpu$/, name: 'GPU' },
    { pattern: /\/intel$/, name: 'INTEL' },
    { pattern: /\/opt$/, name: 'OPT' }
];

export const SUFFIX_PACKAGES: Record<string, string> = {
    omp: 'OPENMP',
    kk: 'KOKKOS',
    kokkos: 'KOKKOS',
    gpu: 'GPU',
    intel: 'INTEL',
    opt: 'OPT'
};

const PAIR_RULES: StyleRule[] = [
    rule('pair_style', /\/cs$/, 'CORESHELL'),
    rule('pair_style', /\/soft$/, 'FEP'),
    rule('pair_style', /\/dielectric$/, 'DIELECTRIC'),
    rule('pair_style', /\/apip$/, 'APIP'),
    rule('pair_style', /^(?:eam|tersoff|airebo|rebo|edip|gw|nb3b|vashishta|threebody)/, 'MANYBODY'),
    rule('pair_style', /^(?:sw|sw\/mod|sw\/angle\/table|meam\/spline|meam\/sw\/spline)$/, 'MANYBODY'),
    rule('pair_style', /^(?:adp|atm|bop|comb|comb3|eim|extep|lcbop|local\/density|polymorphic)$/, 'MANYBODY'),
    rule('pair_style', /^meam(?:\/ms)?$/, 'MEAM'),
    rule('pair_style', /^reaxff$/, 'REAXFF'),
    rule('pair_style', /^snap$/, 'ML-SNAP'),
    rule('pair_style', /^pace/, 'ML-PACE'),
    rule('pair_style', /^mliap$/, 'ML-IAP'),
    rule('pair_style', /^kim$/, 'KIM'),
    rule('pair_style', /class2/, 'CLASS2'),
    rule('pair_style', /^spin/, 'SPIN'),
    rule('pair_style', /dipole/, 'DIPOLE'),
    rule('pair_style', /^(?:gran|granular)/, 'GRANULAR'),
    rule('pair_style', /^(?:gayberne|resquared|line\/lj|tri\/lj)/, 'ASPHERE'),
    rule('pair_style', /^(?:colloid|yukawa\/colloid|brownian|lubricate)/, 'COLLOID'),
    rule('pair_style', /^(?:beck|born\/gauss|buck\/mdf|cosine\/squared|e3b|gauss|harmonic\/cut|lennard\/mdf|lj96\/cut|mie\/cut|momb|nm\/cut|pedone|ufm|wf\/cut)/, 'EXTRA-PAIR'),
    rule('pair_style', /^(?:born\/coul\/(?:dsf|wolf)|coul\/(?:cut\/global|diel|exclude|slater|ctip)|morse\/smooth\/linear|dispersion\/d3)/, 'EXTRA-PAIR'),
    rule('pair_style', /^lj\/(?:cubic|gromacs|mdf|pirani|relres|sf|smooth|cut\/coul\/(?:debye|dsf|wolf)|cut\/sphere|expand\/(?:coul\/long|sphere))/, 'EXTRA-PAIR'),
    rule('pair_style', /^lj\/(?:sdk|spica)/, 'CG-SPICA'),
    rule('pair_style', /(?:coul\/long|coul\/msm|tip4p\/long|^coul\/streitz)/, 'KSPACE'),
    rule('pair_style', /^hbond\/dreiding\/(?:lj|morse)\/angleoffset$/, 'EXTRA-MOLECULE'),
    rule('pair_style', /^(?:lj\/charmm\/coul\/charmm|lj\/charmmfsw\/coul\/charmmfsh|lj\/cut\/tip4p\/cut|tip4p\/cut|hbond\/dreiding)/, 'MOLECULE'),
    rule('pair_style', /^dpd\/fdt/, 'DPD-REACT'),
    rule('pair_style', /^dpd/, 'DPD-BASIC'),
    rule('pair_style', /^peri/, 'PERI'),
    rule('pair_style', /^body/, 'BODY'),
    rule('pair_style', /^eff/, 'EFF'),
    rule('pair_style', /^sph\//, 'SPH'),
    rule('pair_style', /^(?:oxdna|oxrna)/, 'CG-DNA'),
    rule('pair_style', /^(?:ilp|kolmogorov|lebedeva|saip|aip|drip|coul\/shield)/, 'INTERLAYER')
];

const FIX_RULES: StyleRule[] = [
    rule('fix', /^rigid\/meso$/, 'DPD-SMOOTH'),
    rule('fix', /^(?:rigid|shake$|rattle$|ehex$)/, 'RIGID'),
    rule('fix', /^(?:gcmc|atom\/swap|widom|charge\/regulation|sgcmc|bond\/(?:swap|create|break)|mol\/swap|neighbor\/swap|tfmc|hmc)/, 'MC'),
    rule('fix', /^(?:qeq\/(?:rel\/)?reaxff|qeq\/reax|qtpie\/reaxff|acks2\/reaxff|acks2\/reax|reaxff\/(?:bonds|species))$/, 'REAXFF'),
    rule('fix', /^qeq\/comb$/, 'MANYBODY'),
    rule('fix', /^qeq\//, 'QEQ'),
    rule('fix', /^neb\/spin$/, 'SPIN'),
    rule('fix', /^tune\/kspace$/, 'KSPACE'),
    rule('fix', /^cmap$/, 'MOLECULE'),
    rule('fix', /^smd\//, 'MACHDYN'),
    rule('fix', /^(?:neb|hyper\/(?:global|local)|pimd|grem|alchemy)/, 'REPLICA'),
    rule('fix', /^bond\/react$/, 'REACTION'),
    rule('fix', /^(?:pour|wall\/gran|heat\/flow|freeze|damping\/cundall|add\/heat)/, 'GRANULAR'),
    rule('fix', /^(?:ttm|ave\/correlate\/long|ave\/moments|electron\/stopping|gld|gle|nvk|smd$|spring\/rg|viscosity|addtorque|drag|ffl)/, 'EXTRA-FIX'),
    rule('fix', /^(?:flow\/gauss|gjf|momentum\/chunk|numdiff|oneway|pafi|rhok|temp\/(?:csld|csvr)|ti\/spring|tmd|viscous\/sphere)/, 'EXTRA-FIX'),
    rule('fix', /^(?:wall\/(?:ees|flow|reflect\/stochastic|region\/ees)|deform\/pressure|npt\/cauchy|controller|filter\/corotate|nonaffine\/displacement|efield\/tip4p)/, 'EXTRA-FIX'),
    rule('fix', /^(?:nve|nvt|npt|nph)\/asphere|^langevin\/asphere/, 'ASPHERE'),
    rule('fix', /^(?:nve|nvt|npt|nph)\/body/, 'BODY'),
    rule('fix', /^(?:drude|langevin\/drude|tgnvt\/drude|tgnpt\/drude)/, 'DRUDE'),
    rule('fix', /^(?:nve\/spin|precession\/spin|langevin\/spin)/, 'SPIN'),
    rule('fix', /^(?:nvt|npt|nph)\/uef/, 'UEF'),
    rule('fix', /^colvars$/, 'COLVARS'),
    rule('fix', /^plumed$/, 'PLUMED'),
    rule('fix', /^python\//, 'PYTHON'),
    rule('fix', /^electrode/, 'ELECTRODE')
];

const COMPUTE_RULES: StyleRule[] = [
    rule('compute', /^voronoi\/atom$/, 'VORONOI'),
    rule('compute', /^(?:sna|snad|snav)\/atom$|^snap$|^sna\/grid|^gaussian\/grid\/local$/, 'ML-SNAP'),
    rule('compute', /^(?:erotate\/rigid|ke\/rigid|rigid\/local)$/, 'RIGID'),
    rule('compute', /^(?:contact\/atom|fabric)$/, 'GRANULAR'),
    rule('compute', /^ptm\/atom$/, 'PTM'),
    rule('compute', /^reaxff\/atom$/, 'REAXFF'),
    rule('compute', /^(?:ackland\/atom|adf|ave\/sphere\/atom|basal\/atom|born\/matrix|cnp\/atom|composition\/atom|entropy\/atom|hexorder\/atom|rattlers\/atom|slcsa\/atom)$/, 'EXTRA-COMPUTE'),
    rule('compute', /^(?:gyration\/shape|hma|momentum|msd\/nongauss|pressure\/cylinder|stress\/(?:cartesian|cylinder|mop|spherical)|temp\/rotate|ti|dipole\/tip4p|efield\/wolf\/atom)/, 'EXTRA-COMPUTE'),
    rule('compute', /^(?:xrd|saed)$/, 'DIFFRACTION'),
    rule('compute', /^(?:temp|erotate)\/asphere$/, 'ASPHERE')
];

const STRUCTURE_RULES: StyleRule[] = [
    rule('atom_style', /^(?:bond|angle|molecular|full|template)$/, 'MOLECULE'),
    rule('atom_style', /^dipole$/, 'DIPOLE'),
    rule('atom_style', /^peri$/, 'PERI'),
    rule('atom_style', /^electron$/, 'EFF'),
    rule('atom_style', /^spin$/, 'SPIN'),
    rule('atom_style', /^sph$/, 'SPH'),
    rule('atom_style', /^dpd$/, 'DPD-REACT'),
    rule('atom_style', /^wavepacket$/, 'AWPMD'),
    rule('atom_style', /^dielectric$/, 'DIELECTRIC'),
    rule('atom_style', /^oxdna$/, 'CG-DNA'),
    rule('kspace_style', /^scafacos$/, 'SCAFACOS'),
    rule('kspace_style', /dielectric/, 'DIELECTRIC'),
    rule('kspace_style', /electrode/, 'ELECTRODE'),
    rule('kspace_style', /^(?:ewald|pppm|msm)/, 'KSPACE'),
    ...bonded(/^(?:none|zero|hybrid)$/, null),
    ...bonded(/^(?:class2\/p6|cosine\/buck6d|inversion\/harmonic)$/, 'MOFFF'),
    ...bonded(/class2/, 'CLASS2'),
    ...bonded(/^amoeba$/, 'AMOEBA'),
    ...bonded(/^bpm\//, 'BPM'),
    ...bonded(/^(?:oxdna|oxdna2|oxrna2)\//, 'CG-DNA'),
    ...bonded(/^(?:sdk|spica)$/, 'CG-SPICA'),
    ...bonded(/^dipole$/, 'DIPOLE'),
    ...bonded(/^lepton$/, 'LEPTON'),
    ...bonded(/^mesocnt$/, 'MESONT'),
    ...bonded(/^special$/, 'MISC'),
    ...bonded(/^rheo\//, 'RHEO'),
    ...bonded(/^(?:cross|mm3|distharm|sqdistharm)$/, 'YAFF'),
    rule('angle_style', /^quartic$/, 'EXTRA-MOLECULE'),
    ...bonded(/^(?:fene\/nm|gaussian|harmonic\/restrain|harmonic\/shift|nonlinear|cosine\/(?:delta|periodic|shift)|cosine\/squared\/restricted)/, 'EXTRA-MOLECULE'),
    ...bonded(/^(?:fourier|mwlc|helix|nharmonic|quadratic|spherical|table\/cut|cossq|distance|ring)/, 'EXTRA-MOLECULE'),
    ...bonded(/./, 'MOLECULE')
];

const OUTPUT_RULES: StyleRule[] = [
    rule('dump', /\/(?:gz|zstd)$/, 'COMPRESS'),
    rule('dump', /^(?:xtc|dcd|yaml|extxyz)$/, 'EXTRA-DUMP'),
    rule('dump', /^h5md$/, 'H5MD'),
    rule('dump', /^netcdf/, 'NETCDF'),
    rule('dump', /^molfile$/, 'MOLFILE'),
    rule('dump', /^cfg\/uef$/, 'UEF'),
    rule('dump', /\/adios$/, 'ADIOS'),
    rule('dump', /^vtk$/, 'VTK'),
    rule('run_style', /^verlet\/split$/, 'REPLICA'),
    rule('command', /^neb\/spin$/, 'SPIN'),
    rule('command', /^(?:neb|prd|tad|temper|temper\/grem|temper\/npt|hyper)$/, 'REPLICA'),
    rule('command', /^(?:dynamical_matrix|third_order)$/, 'PHONON'),
    rule('command', /^kim$/, 'KIM')
];

export const STYLE_RULES: StyleRule[] = [
    ...PAIR_RULES,
    ...FIX_RULES,
    ...COMPUTE_RULES,
    ...STRUCTURE_RULES,
    ...OUTPUT_RULES
];

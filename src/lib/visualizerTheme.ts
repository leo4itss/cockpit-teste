/**
 * Tokens de tema para SchemaVisualizerPage e CanvasPermissoesPage.
 * Valores são CSS (usados em `style={}`).
 * Tailwind cobre só estrutura/layout; cores sensíveis ao tema ficam aqui.
 */
import React from 'react'

export type ThemeMode = 'dark' | 'light'

export interface BadgeColors { bg: string; text: string; border: string }

export interface VisualizerTheme {
  mode:        ThemeMode
  rfColorMode: 'dark' | 'light'   // colorMode do ReactFlow

  // ── Canvas ─────────────────────────────────────────────────
  canvasBg:       string
  dotColor:       string

  // ── Header / página ────────────────────────────────────────
  headerBg:       string
  headerBorder:   string
  headerText:     string
  headerSub:      string

  // ── Nó genérico (Grupo / Usuário) ──────────────────────────
  cardBg:         string
  cardBorder:     string
  cardSelBorder:  string
  cardSelGlow:    string
  cardText:       string
  cardSub:        string
  cardMuted:      string

  // ── Nó de Instância ────────────────────────────────────────
  instBg:         string
  instBorder:     string
  instSelBorder:  string
  instSelGlow:    string

  // ── Nó de Conta ────────────────────────────────────────────
  contaBg:        string

  // ── Schema — nó de tabela DB ───────────────────────────────
  schNodeBg:      string
  schNodeText:    string
  schNodeNote:    string
  schNodeNull:    string
  schNodeDivide:  string

  // ── Schema — nó FGA ────────────────────────────────────────
  fgaNodeBg:      string
  fgaNodeText:    string
  fgaNodeArrow:   string

  // ── Painel lateral ─────────────────────────────────────────
  panelBg:        string
  panelBorder:    string
  panelText:      string
  panelSub:       string
  panelMuted:     string

  // ── Linhas de lista ────────────────────────────────────────
  rowHover:       string
  rowBg:          string

  // ── Inputs ─────────────────────────────────────────────────
  inputBg:        string
  inputBorder:    string
  inputText:      string
  inputPlaceholder: string

  // ── Dropdown de sugestões ──────────────────────────────────
  dropBg:         string
  dropBorder:     string
  dropHover:      string
  dropText:       string
  dropSub:        string

  // ── Botão de permissões (violeta) ──────────────────────────
  btnPermBg:      string
  btnPermBorder:  string
  btnPermText:    string

  // ── Badges de papel ────────────────────────────────────────
  badgeViewer:    BadgeColors
  badgeUser:      BadgeColors
  badgeAdmin:     BadgeColors

  // ── Rótulos de seção ───────────────────────────────────────
  sectionLabel:   string

  // ── Select de conta ────────────────────────────────────────
  selectBg:       string
  selectBorder:   string
  selectText:     string

  // ── Tabs (Schema) ──────────────────────────────────────────
  tabWrapBg:      string
  tabWrapBorder:  string
  tabActiveBg:    string
  tabActiveText:  string
  tabInactiveText:string

  // ── Legenda ────────────────────────────────────────────────
  legendBg:       string
  legendBorder:   string
  legendText:     string
  legendSub:      string
  legendDivide:   string

  // ── MiniMap ────────────────────────────────────────────────
  minimapBg:      string
  minimapBorder:  string
  minimapMask:    string

  // ── Toggle (botão light/dark) ──────────────────────────────
  toggleBg:       string
  toggleBorder:   string
  toggleText:     string

  // ── Arestas do Canvas ──────────────────────────────────────
  edgeConta:      string   // conta → grupo
  edgeGroup:      string   // usuário → grupo (animated)
  edgeInstUser:   string   // usuário → instância
  edgeInstGroup:  string   // grupo → instância
}

// ── Tema escuro ───────────────────────────────────────────────

export const DARK_THEME: VisualizerTheme = {
  mode:        'dark',
  rfColorMode: 'dark',
  canvasBg:    '#0a0f1a',
  dotColor:    '#1e293b',

  headerBg:     '#0f172a',
  headerBorder: '#1e293b',
  headerText:   '#f1f5f9',
  headerSub:    '#64748b',

  cardBg:        '#1e293b',
  cardBorder:    '#334155',
  cardSelBorder: '#3b82f6',
  cardSelGlow:   '#3b82f640',
  cardText:      '#f1f5f9',
  cardSub:       '#94a3b8',
  cardMuted:     '#64748b',

  instBg:        '#1a1530',
  instBorder:    '#4c3a7a',
  instSelBorder: '#8b5cf6',
  instSelGlow:   '#8b5cf640',

  contaBg:       '#1a2236',

  schNodeBg:     '#1c1c1e',
  schNodeText:   '#e2e8f0',
  schNodeNote:   '#64748b',
  schNodeNull:   '#475569',
  schNodeDivide: 'rgba(255,255,255,0.05)',

  fgaNodeBg:    '#1c1c1e',
  fgaNodeText:  '#d1d5db',
  fgaNodeArrow: '#6b7280',

  panelBg:     '#0f172a',
  panelBorder: '#1e293b',
  panelText:   '#f1f5f9',
  panelSub:    '#94a3b8',
  panelMuted:  '#64748b',

  rowHover: '#1e293b',
  rowBg:    '#1e293b',

  inputBg:          '#1e293b',
  inputBorder:      '#334155',
  inputText:        '#e2e8f0',
  inputPlaceholder: '#475569',

  dropBg:     '#1e293b',
  dropBorder: '#334155',
  dropHover:  '#273549',
  dropText:   '#e2e8f0',
  dropSub:    '#64748b',

  btnPermBg:     'rgba(139,92,246,0.1)',
  btnPermBorder: 'rgba(139,92,246,0.3)',
  btnPermText:   '#c4b5fd',

  badgeViewer: { bg: '#1e293b',             text: '#94a3b8', border: '#334155' },
  badgeUser:   { bg: 'rgba(59,130,246,0.1)', text: '#93c5fd', border: 'rgba(59,130,246,0.4)' },
  badgeAdmin:  { bg: 'rgba(249,115,22,0.1)', text: '#fdba74', border: 'rgba(249,115,22,0.4)' },

  sectionLabel: '#475569',

  selectBg:     '#1e293b',
  selectBorder: '#334155',
  selectText:   '#e2e8f0',

  tabWrapBg:       'rgba(255,255,255,0.05)',
  tabWrapBorder:   'rgba(255,255,255,0.1)',
  tabActiveBg:     'rgba(255,255,255,0.12)',
  tabActiveText:   '#ffffff',
  tabInactiveText: '#9ca3af',

  legendBg:     'rgba(15,23,42,0.92)',
  legendBorder: '#1e293b',
  legendText:   '#94a3b8',
  legendSub:    '#64748b',
  legendDivide: '#1e293b',

  minimapBg:     '#0f172a',
  minimapBorder: '#1e293b',
  minimapMask:   'rgba(10,15,26,0.75)',

  toggleBg:     'rgba(255,255,255,0.08)',
  toggleBorder: 'rgba(255,255,255,0.15)',
  toggleText:   '#94a3b8',

  edgeConta:     '#334155',
  edgeGroup:     '#3b82f6',
  edgeInstUser:  '#22d3ee',
  edgeInstGroup: '#a78bfa',
}

// ── Tema claro (cockpit style) ────────────────────────────────

export const LIGHT_THEME: VisualizerTheme = {
  mode:        'light',
  rfColorMode: 'light',
  canvasBg:    '#f9fafb',
  dotColor:    '#d1d5db',

  headerBg:     '#ffffff',
  headerBorder: '#e5e7eb',
  headerText:   '#111827',
  headerSub:    '#6b7280',

  cardBg:        '#ffffff',
  cardBorder:    '#e5e7eb',
  cardSelBorder: '#3b82f6',
  cardSelGlow:   '#3b82f618',
  cardText:      '#111827',
  cardSub:       '#374151',
  cardMuted:     '#9ca3af',

  instBg:        '#faf5ff',
  instBorder:    '#ddd6fe',
  instSelBorder: '#8b5cf6',
  instSelGlow:   '#8b5cf618',

  contaBg:       '#fffbeb',

  schNodeBg:     '#ffffff',
  schNodeText:   '#1f2937',
  schNodeNote:   '#9ca3af',
  schNodeNull:   '#d1d5db',
  schNodeDivide: '#f3f4f6',

  fgaNodeBg:    '#ffffff',
  fgaNodeText:  '#374151',
  fgaNodeArrow: '#9ca3af',

  panelBg:     '#f9fafb',
  panelBorder: '#e5e7eb',
  panelText:   '#111827',
  panelSub:    '#374151',
  panelMuted:  '#9ca3af',

  rowHover: '#f3f4f6',
  rowBg:    '#f9fafb',

  inputBg:          '#ffffff',
  inputBorder:      '#d1d5db',
  inputText:        '#111827',
  inputPlaceholder: '#9ca3af',

  dropBg:     '#ffffff',
  dropBorder: '#e5e7eb',
  dropHover:  '#f9fafb',
  dropText:   '#111827',
  dropSub:    '#6b7280',

  btnPermBg:     '#f5f3ff',
  btnPermBorder: '#ddd6fe',
  btnPermText:   '#6d28d9',

  badgeViewer: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
  badgeUser:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  badgeAdmin:  { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },

  sectionLabel: '#9ca3af',

  selectBg:     '#ffffff',
  selectBorder: '#d1d5db',
  selectText:   '#111827',

  tabWrapBg:       '#f3f4f6',
  tabWrapBorder:   '#e5e7eb',
  tabActiveBg:     '#ffffff',
  tabActiveText:   '#111827',
  tabInactiveText: '#6b7280',

  legendBg:     'rgba(255,255,255,0.96)',
  legendBorder: '#e5e7eb',
  legendText:   '#374151',
  legendSub:    '#6b7280',
  legendDivide: '#e5e7eb',

  minimapBg:     '#ffffff',
  minimapBorder: '#e5e7eb',
  minimapMask:   'rgba(249,250,251,0.75)',

  toggleBg:     '#f3f4f6',
  toggleBorder: '#e5e7eb',
  toggleText:   '#6b7280',

  edgeConta:     '#d1d5db',
  edgeGroup:     '#3b82f6',
  edgeInstUser:  '#0891b2',
  edgeInstGroup: '#7c3aed',
}

// ── Context ───────────────────────────────────────────────────

export const VisualizerThemeContext = React.createContext<VisualizerTheme>(DARK_THEME)
export const useNodeTheme = () => React.useContext(VisualizerThemeContext)

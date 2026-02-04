# 100% Keyboard Shortcut & Kbd Hint Coverage Plan

## Goal Description
Ensure that **every** interactive element (Button, Link, Dropdown, Dialog Action) across Envault has a relevant keyboard shortcut and a visible `<Kbd>` hint. This includes Landing Page, Auth flows, Dashboard, Projects, Settings, and Notifications.

## Implementation Strategy
1.  **OS-Awareness**: All hints will use `getModifierKey()` to show `⌘/⌥` for Mac and `Ctrl/Alt` for others.
2.  **Contextual Logic**: Shortcuts will only activate when their specific context is visible (e.g., `M` for "Mark all read" only when in Notifications).
3.  **Universal Submission**: `Cmd+Enter` (or `Mod+Enter`) will be standardized for **all** forms and primary dialog actions.
4.  **Discovery**: Add `<Kbd>` hints to tooltips or button labels for all identified gaps.

## Master Shortcut Map

### 1. Landing Page & Navbar
| Element | Context | Shortcut | Hint Status |
| :--- | :--- | :--- | :--- |
| **Get Started** | Hero | `G` | [x] Fixed |
| **Star on GitHub** | Hero | `S` | [ ] Missing |
| **Features** | Navbar | `F` | [ ] Missing |
| **GitHub** | Navbar | `H` | [ ] Missing |
| **Login** | Navbar | `L` | [x] Fixed |
| **Mobile Menu** | Navbar (Mobile) | `M` | [ ] Missing |

### 2. Authentication
| Element | Context | Shortcut | Hint Status |
| :--- | :--- | :--- | :--- |
| **Login Tab** | Auth Form | `L` | [ ] Missing |
| **Sign Up Tab** | Auth Form | `U` | [ ] Missing |
| **Sign In** | Auth Form | `Cmd+Enter` | [ ] Missing |
| **Create Account** | Auth Form | `Cmd+Enter` | [ ] Missing |
| **Google Login** | Auth Form | `Alt+G` | [ ] Missing |
| **GitHub Login** | Auth Form | `Alt+H` | [ ] Missing |
| **Forgot Password** | Auth Form | `F` | [ ] Missing |

### 3. Dashboard
| Element | Context | Shortcut | Hint Status |
| :--- | :--- | :--- | :--- |
| **Search** | Header | `Cmd+K` | [x] Fixed |
| **My Projects** | Tabs | `1` | [x] Fixed |
| **Shared with Me** | Tabs | `2` | [x] Fixed |
| **Create Project** | Dashboard | `N` | [x] Fixed |
| **Project Card** | List | `Enter` (Navigate) | [ ] Implicit |
| **Card Share** | Card Menu | `A` | [ ] Missing |
| **Card Delete** | Card Menu | `Alt+X` | [ ] Missing |

### 4. Project Detail View
| Element | Context | Shortcut | Hint Status |
| :--- | :--- | :--- | :--- |
| **Back Button** | Header | `Esc` / `G H` | [ ] Missing |
| **Settings Menu** | Header | `S` | [ ] Missing |
| **Add Variable** | Main Action | `N` | [x] Fixed |
| **Download .env** | Toolbar | `Cmd+D` | [x] Fixed |
| **Import .env** | Toolbar | `Cmd+I` | [x] Fixed |
| **Variable Row** | Table | `Enter` (Edit) | [ ] Missing |
| **Row Delete** | Table | `Alt+X` | [ ] Missing |

### 5. Dialogs (Universal)
| Element | Context | Shortcut | Hint Status |
| :--- | :--- | :--- | :--- |
| **Confirm Action** | Any AlertDialog | `Enter` | [ ] Missing |
| **Cancel Action** | Any Dialog | `Esc` | [ ] Implicit |
| **Show/Hide Value** | Var Dialog | `V` | [ ] Missing |

### 6. Settings
| Element | Context | Shortcut | Hint Status |
| :--- | :--- | :--- | :--- |
| **Tab Nav 1-5** | Sidebar | `1-2-3-4-5`| [x] Fixed |
| **Save Profile** | Profile Tab | `Cmd+S` | [x] Fixed |
| **Save Notif Pref**| Notif Tab | `Cmd+S` | [x] Fixed |
| **Logout** | Global/Settings | `Alt+Q` | [x] Fixed |
| **Delete Token** | Security Tab | `Alt+X` | [x] Tooltip only |

### 7. Notifications
| Element | Context | Shortcut | Hint Status |
| :--- | :--- | :--- | :--- |
| **Toggle Bell** | Header | `Shift+B` | [x] Fixed |
| **Mark all Read** | List/Dropdown | `M` | [x] Fixed in Dropdown |
| **Clear Read** | List/Dropdown | `C` | [x] Fixed in Dropdown |
| **Navigation V** | Dropdown | `V` | [x] Fixed |

## Implementation Plan

### Phase 1: Foundational Enhancements
- [ ] Add `Universal-Submit` logic to `ShortcutProvider`.
- [ ] Update `Kbd` component to support more variants (size, color).

### Phase 2: Landing & Auth Coverage
- [ ] Update `Hero.tsx` & `Navbar.tsx` with missing shortcuts.
- [ ] Update `AuthForm.tsx` with all missing hotkeys and Kbd hints.

### Phase 3: Dashboard & Project Coverage
- [ ] Implement `Enter` to navigate for Project Cards.
- [ ] Add `Back` button shortcuts globally.
- [ ] Update `ProjectCard.tsx` dropdowns with visible hints.

### Phase 4: Shared Dialogs & Tooltips
- [ ] Audit all `AlertDialog` components to ensure `Enter` is hinted.
- [ ] Update `VariableDialog.tsx` with `V` shortcut for eye-toggle.

## Verification Plan
1.  **Full Mouse-Less Walkthrough**: Navigate from Landing -> Auth -> Dashboard -> Project -> Settings using only keyboard.
2.  **Visual Audit**: Ensure every single primary/secondary button has a `<Kbd>` either next to it or in its tooltip.

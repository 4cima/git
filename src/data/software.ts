export type SoftwareRow = {
  id: number
  title: string
  poster_url?: string | null
  backdrop_url?: string | null
  rating?: number | null
  year?: number | null
  release_year?: number | null
  category?: string | null
  download_url?: string | null
  description?: string | null
  version?: string | null
  size?: string | null
  platform?: 'pc' | 'android' | 'apple' | 'terminal' | 'other'
}

export const SOFTWARE_MOCK_ITEMS: SoftwareRow[] = [
  { id: 201, title: 'Visual Studio Code', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/2048px-Visual_Studio_Code_1.35_icon.svg.png', rating: 9.9, category: 'Development', description: 'Code editing. Redefined.', version: '1.86.0', size: '120 MB', platform: 'pc' },
  { id: 202, title: 'Adobe Photoshop', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1200px-Adobe_Photoshop_CC_icon.svg.png', rating: 9.5, category: 'Design', description: 'Reimagine reality with Photoshop.', version: '2024', size: '4 GB', platform: 'pc' },
  { id: 203, title: 'Google Chrome', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg', rating: 9.0, category: 'Browser', description: 'The browser built by Google.', version: '122.0', size: '90 MB', platform: 'pc' },
  { id: 204, title: 'VLC Media Player', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/VLC_Icon.svg', rating: 9.2, category: 'Multimedia', description: 'The best open source media player.', version: '3.0.20', size: '40 MB', platform: 'pc' },
  { id: 205, title: 'Discord', poster_url: 'https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png', rating: 9.4, category: 'Communication', description: 'Your place to talk and hang out.', version: 'Stable', size: '85 MB', platform: 'pc' },
  { id: 301, title: 'Termux', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Termux_Logo.png/800px-Termux_Logo.png', rating: 9.8, category: 'Terminal', description: 'Powerful terminal emulation for Android.', version: '0.118', size: '90 MB', platform: 'android' },
  { id: 302, title: 'MX Player', poster_url: 'https://play-lh.googleusercontent.com/e3oZddH3M9kC8kX5A9g1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1', rating: 9.4, category: 'Multimedia', description: 'Powerful video player.', version: 'Latest', size: '50 MB', platform: 'android' },
  { id: 303, title: 'F-Droid', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/F-Droid_Logo_2017.svg/2048px-F-Droid_Logo_2017.svg.png', rating: 9.6, category: 'Store', description: 'FOSS app repository for Android.', version: '1.19', size: '15 MB', platform: 'android' },
  { id: 401, title: 'Xcode', poster_url: 'https://developer.apple.com/assets/elements/icons/xcode/xcode-128x128_2x.png', rating: 9.7, category: 'Development', description: 'Everything you need to create great apps.', version: '15.2', size: '10 GB', platform: 'apple' },
  { id: 402, title: 'Final Cut Pro', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Final_Cut_Pro_X.png/800px-Final_Cut_Pro_X.png', rating: 9.5, category: 'Video Editing', description: 'Professional video editing for Mac.', version: '10.7', size: '4 GB', platform: 'apple' },
  { id: 403, title: 'IINA', poster_url: 'https://iina.io/images/iina-icon.png', rating: 9.6, category: 'Multimedia', description: 'The modern video player for macOS.', version: '1.3.3', size: '60 MB', platform: 'apple' },
  { id: 501, title: 'Oh My Zsh', poster_url: 'https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/docs/public/favicon.ico', rating: 9.9, category: 'Shell', description: 'Unleash your terminal like never before.', version: 'Latest', size: 'N/A', platform: 'terminal' },
  { id: 502, title: 'Docker', poster_url: 'https://www.docker.com/wp-content/uploads/2022/03/vertical-logo-monochromatic.png', rating: 9.8, category: 'DevOps', description: 'OS-level virtualization.', version: '25.0', size: '500 MB', platform: 'terminal' },
  { id: 503, title: 'Neovim', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Neovim-mark.svg/1200px-Neovim-mark.svg.png', rating: 9.9, category: 'Editor', description: 'Hyperextensible Vim-based text editor.', version: '0.9.5', size: '10 MB', platform: 'terminal' }
]

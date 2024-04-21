import document from 'global/document';
import videojs from 'video.js';

const Component = videojs.getComponent('Component');

const createThumbnailPlaceholder = function() {
  const placeholder = document.createElement('div');

  placeholder.className = 'vjs-playlist-thumbnail vjs-playlist-thumbnail-placeholder';
  return placeholder;
};

class PlaylistMenuItem extends Component {
  constructor(player, playlistItem, settings) {
    if (!playlistItem.item) {
      throw new Error('Cannot construct a PlaylistMenuItem without an item option');
    }

    playlistItem.showDescription = settings.showDescription;
    super(player, playlistItem);
    this.item = playlistItem.item;

    this.playOnSelect = settings.playOnSelect;

    this.emitTapEvents();

    this.on(['click', 'tap'], this.switchPlaylistItem_);
    this.on('keydown', this.handleKeyDown_);
  }

  handleKeyDown_(event) {
    // keycode 13 is <Enter>
    // keycode 32 is <Space>
    if (event.which === 13 || event.which === 32) {
      this.switchPlaylistItem_();
    }
  }

  switchPlaylistItem_(event) {
    if (!event.target.classList.contains('vjs-playlist-add-button')) {
      this.player_.playlist.currentItem(this.player_.playlist().indexOf(this.item));
      if (this.playOnSelect) {
        this.player_.play();
      }
    }
  }

  createEl() {
    const li = document.createElement('li');
    const item = this.options_.item;

    if (typeof item.data === 'object') {
      const dataKeys = Object.keys(item.data);

      dataKeys.forEach(key => {
        const value = item.data[key];

        li.dataset[key] = value;
      });
    }

    li.className = 'vjs-playlist-item';
    li.setAttribute('tabIndex', 0);

    // Thumbnail placeholder
    this.thumbnail = createThumbnailPlaceholder();
    li.appendChild(this.thumbnail);

    // Title container contains title and "up next"
    const titleContainerEl = document.createElement('div');

    titleContainerEl.className = 'vjs-playlist-clip-container';
    this.thumbnail.appendChild(titleContainerEl);

    // Video title
    const titleEl = document.createElement('cite');
    const titleText = item.name || this.localize('Untitled Video');

    titleEl.className = 'vjs-clip-name';
    titleEl.appendChild(document.createTextNode(titleText));
    titleEl.setAttribute('title', titleText);
    titleContainerEl.appendChild(titleEl);

    // Add button
    const addButton = document.createElement('button');
    const addButtonText = this.localize('Add');

    addButton.className = 'vjs-playlist-add-button';
    addButton.appendChild(document.createTextNode(addButtonText));
    addButton.setAttribute('title', addButtonText);

    // Attach click event listener to the button
    addButton.addEventListener('click', () => {
      // Emit a custom event with the clip data
      this.player().trigger('add-clip', { title: item.name });
    });

    titleEl.appendChild(addButton);

    return li;
  }
}

videojs.registerComponent('PlaylistMenuItem', PlaylistMenuItem);

export default PlaylistMenuItem;

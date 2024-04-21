/*! @name videojs-playlist-ui @version 5.0.0 @license Apache-2.0 */
import document from 'global/document';
import videojs from 'video.js';

var version = "5.0.0";

const Component$1 = videojs.getComponent('Component');
const createThumbnailPlaceholder = function () {
  const placeholder = document.createElement('div');
  placeholder.className = 'vjs-playlist-thumbnail vjs-playlist-thumbnail-placeholder';
  return placeholder;
};
class PlaylistMenuItem extends Component$1 {
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
      this.player().trigger('add-clip', {
        title: item.name
      });
    });
    titleEl.appendChild(addButton);
    return li;
  }
}
videojs.registerComponent('PlaylistMenuItem', PlaylistMenuItem);

// we don't add `vjs-playlist-now-playing` in addSelectedClass
// so it won't conflict with `vjs-icon-play
// since it'll get added when we mouse out
const addSelectedClass = function (el) {
  el.addClass('vjs-selected');
};
const removeSelectedClass = function (el) {
  el.removeClass('vjs-selected');
  if (el.thumbnail) {
    videojs.dom.removeClass(el.thumbnail, 'vjs-playlist-now-playing');
  }
};
const upNext = function (el) {
  el.addClass('vjs-up-next');
};
const notUpNext = function (el) {
  el.removeClass('vjs-up-next');
};
const Component = videojs.getComponent('Component');
class PlaylistMenu extends Component {
  constructor(player, options) {
    super(player, options);
    this.items = [];
    if (options.horizontal) {
      this.addClass('vjs-playlist-horizontal');
    } else {
      this.addClass('vjs-playlist-vertical');
    }

    // If CSS pointer events aren't supported, we have to prevent
    // clicking on playlist items during ads with slightly more
    // invasive techniques. Details in the stylesheet.
    if (options.supportsCssPointerEvents) {
      this.addClass('vjs-csspointerevents');
    }
    this.createPlaylist_();
    if (!videojs.browser.TOUCH_ENABLED) {
      this.addClass('vjs-mouse');
    }
    this.on(player, ['loadstart', 'playlistchange', 'playlistsorted'], e => {
      // The playlistadd and playlistremove events are handled separately. These
      // also fire the playlistchange event with an `action` property, so can
      // exclude them here.
      if (e.type === 'playlistchange' && ['add', 'remove'].includes(e.action)) {
        return;
      }
      this.update();
    });
    this.on(player, ['playlistadd'], e => this.addItems_(e.index, e.count));
    this.on(player, ['playlistremove'], e => this.removeItems_(e.index, e.count));

    // Keep track of whether an ad is playing so that the menu
    // appearance can be adapted appropriately
    this.on(player, 'adstart', () => {
      this.addClass('vjs-ad-playing');
    });
    this.on(player, 'adend', () => {
      this.removeClass('vjs-ad-playing');
    });
    this.on('dispose', () => {
      this.empty_();
      player.playlistMenu = null;
    });
    this.on(player, 'dispose', () => {
      this.dispose();
    });
  }
  createEl() {
    return videojs.dom.createEl('div', {
      className: this.options_.className
    });
  }
  empty_() {
    if (this.items && this.items.length) {
      this.items.forEach(i => i.dispose());
      this.items.length = 0;
    }
  }
  createPlaylist_() {
    const playlist = this.player_.playlist() || [];
    let list = this.el_.querySelector('.vjs-playlist-item-list');
    let overlay = this.el_.querySelector('.vjs-playlist-ad-overlay');
    if (!list) {
      list = document.createElement('ol');
      list.className = 'vjs-playlist-item-list';
      this.el_.appendChild(list);
    }
    this.empty_();

    // create new items
    for (let i = 0; i < playlist.length; i++) {
      const item = new PlaylistMenuItem(this.player_, {
        item: playlist[i]
      }, this.options_);
      this.items.push(item);
      list.appendChild(item.el_);
    }

    // Inject the ad overlay. We use this element to block clicks during ad
    // playback and darken the menu to indicate inactivity
    if (!overlay) {
      overlay = document.createElement('li');
      overlay.className = 'vjs-playlist-ad-overlay';
      list.appendChild(overlay);
    } else {
      // Move overlay to end of list
      list.appendChild(overlay);
    }

    // select the current playlist item
    const selectedIndex = this.player_.playlist.currentItem();
    if (this.items.length && selectedIndex >= 0) {
      addSelectedClass(this.items[selectedIndex]);
      const thumbnail = this.items[selectedIndex].$('.vjs-playlist-thumbnail');
      if (thumbnail) {
        videojs.dom.addClass(thumbnail, 'vjs-playlist-now-playing');
      }
    }
  }

  /**
   * Adds a number of playlist items to the UI.
   *
   * Each item that was added to the underlying playlist in a certain range
   * has a new PlaylistMenuItem created for it.
   *
   * @param  {number} index
   *         The index at which to start adding items.
   *
   * @param  {number} count
   *         The number of items to add.
   */
  addItems_(index, count) {
    const playlist = this.player_.playlist();
    const items = playlist.slice(index, count + index);
    if (!items.length) {
      return;
    }
    const listEl = this.el_.querySelector('.vjs-playlist-item-list');
    const listNodes = this.el_.querySelectorAll('.vjs-playlist-item');

    // When appending to the list, `insertBefore` will only reliably accept
    // `null` as the second argument, so we need to explicitly fall back to it.
    const refNode = listNodes[index] || null;
    const menuItems = items.map(item => {
      const menuItem = new PlaylistMenuItem(this.player_, {
        item
      }, this.options_);
      listEl.insertBefore(menuItem.el_, refNode);
      return menuItem;
    });
    this.items.splice(index, 0, ...menuItems);
  }

  /**
   * Removes a number of playlist items from the UI.
   *
   * Each PlaylistMenuItem component is disposed properly.
   *
   * @param  {number} index
   *         The index at which to start removing items.
   *
   * @param  {number} count
   *         The number of items to remove.
   */
  removeItems_(index, count) {
    const components = this.items.slice(index, count + index);
    if (!components.length) {
      return;
    }
    components.forEach(c => c.dispose());
    this.items.splice(index, count);
  }
  update() {
    // replace the playlist items being displayed, if necessary
    const playlist = this.player_.playlist();
    if (this.items.length !== playlist.length) {
      // if the menu is currently empty or the state is obviously out
      // of date, rebuild everything.
      this.createPlaylist_();
      return;
    }
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].item !== playlist[i]) {
        // if any of the playlist items have changed, rebuild the
        // entire playlist
        this.createPlaylist_();
        return;
      }
    }

    // the playlist itself is unchanged so just update the selection
    const currentItem = this.player_.playlist.currentItem();
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (i === currentItem) {
        addSelectedClass(item);
        if (document.activeElement !== item.el()) {
          videojs.dom.addClass(item.thumbnail, 'vjs-playlist-now-playing');
        }
        notUpNext(item);
      } else if (i === currentItem + 1) {
        removeSelectedClass(item);
        upNext(item);
      } else {
        removeSelectedClass(item);
        notUpNext(item);
      }
    }
  }
}
videojs.registerComponent('PlaylistMenu', PlaylistMenu);

// see https://github.com/Modernizr/Modernizr/blob/master/feature-detects/css/pointerevents.js
const supportsCssPointerEvents = (() => {
  const element = document.createElement('x');
  element.style.cssText = 'pointer-events:auto';
  return element.style.pointerEvents === 'auto';
})();
const defaults = {
  className: 'vjs-playlist',
  playOnSelect: false,
  supportsCssPointerEvents
};
const Plugin = videojs.getPlugin('plugin');

/**
 * Initialize the plugin on a player.
 *
 * @param  {Object} [options]
 *         An options object.
 *
 * @param  {HTMLElement} [options.el]
 *         A DOM element to use as a root node for the playlist.
 *
 * @param  {string} [options.className]
 *         An HTML class name to use to find a root node for the playlist.
 *
 * @param  {boolean} [options.playOnSelect = false]
 *         If true, will attempt to begin playback upon selecting a new
 *         playlist item in the UI.
 */
class PlaylistUI extends Plugin {
  constructor(player, options) {
    super(player, options);
    if (!player.usingPlugin('playlist')) {
      player.log.error('videojs-playlist plugin is required by the videojs-playlist-ui plugin');
      return;
    }
    options = this.options_ = videojs.obj.merge(defaults, options);
    if (!videojs.dom.isEl(options.el)) {
      options.el = this.findRoot_(options.className);
    }

    // Expose the playlist menu component on the player as well as the plugin
    // This is a bit of an anti-pattern, but it's been that way forever and
    // there are likely to be integrations relying on it.
    this.playlistMenu = player.playlistMenu = new PlaylistMenu(player, options);
  }

  /**
   * Dispose the plugin.
   */
  dispose() {
    super.dispose();
    this.playlistMenu.dispose();
  }

  /**
   * Returns a boolean indicating whether an element has child elements.
   *
   * Note that this is distinct from whether it has child _nodes_.
   *
   * @param  {HTMLElement} el
   *         A DOM element.
   *
   * @return {boolean}
   *         Whether the element has child elements.
   */
  hasChildEls_(el) {
    for (let i = 0; i < el.childNodes.length; i++) {
      if (videojs.dom.isEl(el.childNodes[i])) {
        return true;
      }
    }
    return false;
  }

  /**
   * Finds the first empty root element.
   *
   * @param  {string} className
   *         An HTML class name to search for.
   *
   * @return {HTMLElement}
   *         A DOM element to use as the root for a playlist.
   */
  findRoot_(className) {
    const all = document.querySelectorAll('.' + className);
    for (let i = 0; i < all.length; i++) {
      if (!this.hasChildEls_(all[i])) {
        return all[i];
      }
    }
  }
}
videojs.registerPlugin('playlistUi', PlaylistUI);
PlaylistUI.VERSION = version;

export { PlaylistUI as default };

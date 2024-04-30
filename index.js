const module = (function() {
    const album = controller.module("media-album");

    var _media_items = [];
    var _media_item_values = {};
    var _cached_thumbnails = {};
    var _thumbnail_callbacks = {};
    var _meet_end_of_item = false;
    var _iterator;

    function _prepare_media_iterator() {
        if (!_iterator) {
            return album.iterate([ "image", "video" ])
                .then((iterator) => {
                    _iterator = iterator;
                
                    _media_items = [];
                    _media_item_values = {};
                    _meet_end_of_item = false;     
                });
        } else {
            return Promise.resolve(_iterator);
        }
    }

    function _load_next_media_items(count) {
        while (count > 0 && !_meet_end_of_item) {
            if (!_iterator.next()) {
                _meet_end_of_item = true;

                break;
            }

            const item = _iterator.info();

            _update_thumbnail_url(item.id, _iterator);
            
            _media_items.push(item);
            _media_item_values[item.id] = item;

            count = count - 1;
        }
    }

    function _update_recent_media_items() {
        return album.iterate([ "image", "video" ])
                .then((iterator) => {
                    const items = [];

                    while (iterator.next()) {
                        const item = iterator.info();

                        if (item.id === _media_items[0].id) {
                            break;
                        }

                        _update_thumbnail_url(item.id, iterator);

                        items.push(item);
                    }

                    return items;
                })
                .then((items) => {
                    if (items.length > 0) {
                        _media_items.unshift(...items);
                    }
                        
                    items.forEach((item) => {
                        _media_item_values[item.id] = item;
                    });

                    return Promise.resolve();
                });
    }

    function _get_media_items(filter, location, length) {
        const items = [];

        var index = location, count = length;

        while (count > 0) {
            if (index >= _media_items.length) {
                _load_next_media_items(length);
            
                if (index >= _media_items.length) {
                    break;
                }
            }

            const item = _media_items[index];

            if (filter.includes(item.type)) {
                items.push(item);
            }

            index = index + 1, count = count - 1;
        }

        return items;
    }

    function _update_thumbnail_url(identifier, iterator) {
        iterator.thumbnail()
            .then((thumbnail) => {
                const item = _media_item_values[identifier];

                item.thumbnail_url = thumbnail.url();
                _cached_thumbnails[item.id] = thumbnail;

                if (_thumbnail_callbacks[item.id]) {
                   const [ resolve, ] = _thumbnail_callbacks[item.id];

                   resolve(item.thumbnail_url);

                   delete _thumbnail_callbacks[item.id];
                }
            })
            .catch(() => {
                const item = _media_item_values[identifier];

                item.thumbnail_url = null;

                if (_thumbnail_callbacks[item.id]) {
                    const [ , reject ] = _thumbnail_callbacks[item.id];

                    reject();

                    delete _thumbnail_callbacks[item.id];
                }
            });
    }

    function _dispose_cached_thumbnails() {
        Object.values(_cached_thumbnails).forEach((thumbnail) => {
            thumbnail.dispose();
        });

        _cached_thumbnails = {};
    }

    return {
        get_media_items: function(filter, location, length) {
            return _prepare_media_iterator()
                .then(() => {
                    if (_media_items.length > 0) {
                        return _update_recent_media_items();
                    } else {
                        return Promise.resolve();
                    }
                })
                .then(() => {
                    return _get_media_items(filter, location, length);
                });
        },

        get_thumbnail_url: function(identifier) {
            const item = _media_item_values[identifier];

            if (item.thumbnail_url !== undefined) {
                if (item.thumbnail_url !== null) {
                    return Promise.resolve(item.thumbnail_url);
                } else {
                    return Promise.reject();
                }
            } else {
                return new Promise((resolve, reject) => {
                    _thumbnail_callbacks[identifier] = [ resolve, reject ];
                });
            }
        }
    }
})();

__MODULE__ = module;

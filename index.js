const module = (function() {
    const album = controller.module("media-album");

    var _media_items = [];
    var _media_item_values = {};
    var _meet_end_of_item = false;
    var _iterator;

    function _prepare_media_iterator(filter) {
        if (!_iterator) {
            return album.iterate(filter)
                .then((iterator) => {
                    _iterator = iterator;

                    _media_items = [];
                    _media_item_values = {};
                    _meet_end_of_item = false;    
                    
                    return _media_items.length;
                });
        } else {
            return Promise.resolve(_media_items.length);
        }
    }

    function _update_recent_media_items(filter) {
        return album.iterate(filter)
                .then((iterator) => {
                    const items = [];

                    while (iterator.next()) {
                        const item = iterator.info();

                        if (item.id === _media_items[0].id) {
                            break;
                        }

                        items.push(item);
                    }

                    return items;
                })
                .then((items) => {
                    if (items.length > 0) {
                        _media_items.unshift(...items);
                    }
                    
                    for (const item of items) {
                        _media_item_values[item.id] = item;
                    }

                    return Promise.resolve();
                });
    }

    function _get_media_items(location, length) {
        const items = [];

        var index = location, count = length;

        while (count > 0) {
            if (index >= _media_items.length) {
                _load_next_media_items(length);
            
                if (index >= _media_items.length) {
                    break;
                }
            }

            items.push(_media_items[index]);

            index = index + 1, count = count - 1;
        }

        return items;
    }

    function _load_next_media_items(count) {
        while (count > 0 && !_meet_end_of_item) {
            if (!_iterator.next()) {
                _meet_end_of_item = true;

                break;
            }

            const item = _iterator.info();

            _media_items.push(item);
            _media_item_values[item.id] = item;

            count = count - 1;
        }
    }

    function _prepare_media_item(identifier) {
        const item = _media_item_values[identifier];

        if (item) {
            return _iterator.prepare(item.id);
        } else {
            return Promise.reject();
        }
    }

    function _get_thumbnail_url(identifier) {
        const item = _media_item_values[identifier];

        if (item) {
            if (item.thumbnail_url === undefined) {
                return _iterator.thumbnail(item.id)
                    .then((thumbnail) => {
                        return item.thumbnail_url = thumbnail.url();
                    })
                    .catch(() => {
                        return item.thumbnail_url = null;
                    });
            } else {
                return Promise.resolve(item.thumbnail_url);
            }   
        } else {
            return Promise.reject();
        }
    }

    return {
        get_media_items: function(filter, location, length) {
            return _prepare_media_iterator(filter)
                .then((last_item_count) => {
                    if (last_item_count > 0) {
                        return _update_recent_media_items(filter);
                    } else {
                        return Promise.resolve();
                    }
                })
                .then(() => {
                    return _get_media_items(location, length);
                });
        },

        prepare_media_item: function(identifier) {
            return _prepare_media_item(identifier);
        },

        get_thumbnail_url: function(identifier) {
            return _get_thumbnail_url(identifier)
                .then((thumbnail_url) => {
                    if (thumbnail_url !== null) {
                        return thumbnail_url;
                    } else {
                        return Promise.reject();
                    }
                });
        }
    }
})();

__MODULE__ = module;

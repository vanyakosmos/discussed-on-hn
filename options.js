!function () {
    let form = document.querySelector('form');

    chrome.storage.local.get(['options'], res => {
        let options = res.options && JSON.parse(res.options) || {
            openList: true,
            checkOnClick: true,
        };
        form.list.checked = options.openList;
        form.load.value = options.checkOnClick ? 'click' : 'always';
    });

    form.onsubmit = function (e) {
        e.preventDefault();
        chrome.storage.local.set({
            options: JSON.stringify({
                openList: form.list.checked,
                checkOnClick: form.load.value === 'click',
            }),
        });
    };

}();

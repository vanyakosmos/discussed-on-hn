!function () {
    let form = document.querySelector('form');
    let info = document.getElementById('info');

    chrome.storage.local.get(['options'], res => {
        let options = res.options && JSON.parse(res.options) || {
            openList: true,
            checkOnClick: true,
            allowSubmit: true,
        };
        form.openList.value = options.openList ? 'true' : 'false';
        form.checkOnClick.value = options.checkOnClick ? 'true' : 'false';
        form.allowSubmit.value = options.allowSubmit ? 'true' : 'false';
    });

    form.onsubmit = function (e) {
        e.preventDefault();
        chrome.storage.local.set({
            options: JSON.stringify({
                openList: form.openList.value === 'true',
                checkOnClick: form.checkOnClick.value === 'true',
                allowSubmit: form.allowSubmit.value === 'true',
            }),
        }, () => {
            info.style.opacity = '1';
            setTimeout(() => {
                info.style.opacity = '0'
            }, 500)
        });
    };
}();

<template>
    <div class="container">
        <div class="content">
            <aside>
                <div class="tab-menu my-aside">
                    <ul>
                        <li>小程序商店</li>
                        <li class="tab-menu-selected">我的小程序</li>
                        <li>用户中心</li>
                    </ul>
                </div>
            </aside>
            <main>
                <div class="pagination">
                    <!-- 分页 -->
                </div>
                <div class="my_app_list">
                    <button type="button" class="btn btn-sm btn-primary">launch app</button>
                </div>
                <div></div>
            </main>
        </div>
        <footer>
            <div class="bottom"></div>
        </footer>
    </div>
</template>

<script setup>
import 'simple-ui/src/ui.css';
import 'simple-ui/src/ui';
</script>

<style scoped>
.my_aside{width: 120px;}
.bottom {height: 40px;}
</style>

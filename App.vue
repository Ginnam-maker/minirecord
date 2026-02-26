<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useRecordStore } from '@/stores/recordStore.js'

onLaunch(() => {
  console.log('App Launch')
  
  // 初始化数据存储
  const recordStore = useRecordStore()
  recordStore.init()
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
	/*每个页面公共css */
	@import '@/uni_modules/uni-scss/index.scss';
	/* #ifndef APP-NVUE */
	@import '@/static/customicons.css';
	// 设置整个项目的背景色
	page {
		background-color: #f5f5f5;
	}

	/* #endif */
	.example-info {
		font-size: 14px;
		color: #333;
		padding: 10px;
	}
</style>
